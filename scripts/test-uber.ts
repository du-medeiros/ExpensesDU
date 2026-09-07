import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const { data: authData } = await client.auth.signInWithPassword({
    email: 'usera@example.com',
    password: 'password123'
  });

  const jwt = authData?.session?.access_token || process.env.SUPABASE_ANON_KEY;
  const historico: any[] = [];
  
  for (let i = 1; i <= 5; i++) {
    const texto = "uber 25";
    console.log(`\nTest ${i}: Sending "${texto}"`);
    
    const response = await fetch('http://127.0.0.1:54321/functions/v1/interpretar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        texto,
        dataCliente: '2026-09-04',
        timezone: 'America/Sao_Paulo',
        client_message_id: 'test-uber-' + i,
        historico: [...historico] // Envia o histórico acumulado
      })
    });

    const data = await response.json();
    console.log(`Response ${i}:`, JSON.stringify(data, null, 2));

    // Adiciona ao histórico (simulando frontend)
    historico.push({ role: 'user', content: texto });
    if (data.resposta) {
      historico.push({ role: 'assistant', content: data.resposta });
    } else {
      historico.push({ role: 'assistant', content: 'Registrado.' }); // Apenas mock
    }
  }
}

main().catch(console.error);
