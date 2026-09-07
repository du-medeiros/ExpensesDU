import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'usera@example.com',
    password: 'password123'
  });

  const jwt = authData?.session?.access_token;
  if (!jwt) throw new Error('Failed to login');

  const tests = [
    { name: 'Simulate 23:30 of 30/09', dataCliente: '2026-09-30', text: 'almoço 32' },
    { name: 'Simulate 23:30 of 30/09 - Ontem', dataCliente: '2026-09-30', text: 'almoço 32 ontem' },
    { name: 'Simulate 00:30 of 01/10', dataCliente: '2026-10-01', text: 'almoço 32' }
  ];

  for (const t of tests) {
    console.log('\n---', t.name, '---');
    const response = await fetch('http://127.0.0.1:54321/functions/v1/interpretar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        texto: t.text,
        dataCliente: t.dataCliente,
        timezone: 'America/Sao_Paulo',
        client_message_id: 'test-tz-' + Math.random().toString(36).substring(7),
      })
    });
    
    const data = await response.json();
    console.log('Intencao:', data.intencao);
    if (data.transacoes_criadas && data.transacoes_criadas.length > 0) {
      console.log('Data gravada:', data.transacoes_criadas[0].data);
    } else {
      console.log('Result:', data);
    }
  }
}

main().catch(console.error);
