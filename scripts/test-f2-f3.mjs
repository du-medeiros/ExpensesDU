import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_KEY);

async function signIn() {
  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: 'teste@dio.com.br',
    password: 'password123'
  });
  if (error) throw error;
  return data.session;
}

async function testInterpretar(session, payload) {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/interpretar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  return { status: response.status, data };
}

async function main() {
  console.log('--- TEST F2 & F3 ---');
  const session = await signIn();
  const dataCliente = '2026-09-07';
  
  await supabase.from('transactions').delete().eq('user_id', session.user.id).like('descricao', '%uber%');
  await supabase.from('transactions').delete().eq('user_id', session.user.id).like('descricao', '%almoço%');
  await supabase.from('transactions').delete().eq('user_id', session.user.id).like('descricao', '%gastei 45%');

  console.log('\n1. Teste Defeito 1 e 4 (almoço -> pede valor -> responde valor)');
  const r1 = await testInterpretar(session, {
    texto: 'almoço',
    dataCliente,
    timezone: 'America/Sao_Paulo',
    client_message_id: crypto.randomUUID()
  });
  console.log('Respondeu (esperado: pedir valor):', r1.data.pergunta?.campo_faltante);
  
  if (r1.data.pergunta?.id) {
    console.log('Respondendo valor 32 para a pergunta pendente...');
    const r2 = await testInterpretar(session, {
      resposta_pendente: { id: r1.data.pergunta.id, valor: '32' },
      dataCliente,
      timezone: 'America/Sao_Paulo',
      client_message_id: crypto.randomUUID()
    });
    console.log('Criou transação?', r2.data.transacoes_criadas?.length > 0 ? 'SIM' : 'NÃO');
    console.log('Transacao salva:', r2.data.transacoes_criadas?.[0]);
  }

  console.log('\n2. Teste Defeito 2 (gastei 45 -> cai em outros sem perguntar)');
  const r3 = await testInterpretar(session, {
    texto: 'gastei 45',
    dataCliente,
    timezone: 'America/Sao_Paulo',
    client_message_id: crypto.randomUUID()
  });
  console.log('Criou transação?', r3.data.transacoes_criadas?.length > 0 ? 'SIM' : 'NÃO');
  console.log('Categoria salva:', r3.data.transacoes_criadas?.[0]?.categoria);
  
  console.log('\n3. Teste F3 (Repetição Oculta: uber 25 x2)');
  const r4 = await testInterpretar(session, {
    texto: 'uber 25',
    dataCliente,
    timezone: 'America/Sao_Paulo',
    client_message_id: crypto.randomUUID()
  });
  console.log('Primeiro envio salvou?', r4.data.transacoes_criadas?.length > 0 ? 'SIM' : 'NÃO');
  
  const r5 = await testInterpretar(session, {
    texto: 'uber 25',
    dataCliente,
    timezone: 'America/Sao_Paulo',
    client_message_id: crypto.randomUUID()
  });
  console.log('Segundo envio detectou duplicidade?', r5.data.pergunta?.campo_faltante === 'confirmacao' ? 'SIM' : 'NÃO');
  console.log('Pergunta gerada:', r5.data.pergunta?.texto);
  
  if (r5.data.pergunta?.id) {
    console.log('Confirmando duplicidade ("Sim, lançar")...');
    const r6 = await testInterpretar(session, {
      resposta_pendente: { id: r5.data.pergunta.id, valor: 'Sim, lançar' },
      dataCliente,
      timezone: 'America/Sao_Paulo',
      client_message_id: crypto.randomUUID()
    });
    console.log('Criou segunda transação (duplicada)?', r6.data.transacoes_criadas?.length > 0 ? 'SIM' : 'NÃO');
    if (r6.data.transacoes_criadas?.length > 0) {
      console.log('Salvou com valor:', r6.data.transacoes_criadas?.[0]?.valor);
    }
  }

  console.log('\n--- FIM ---');
}

main().catch(console.error);
