import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function main() {
  const email = 'demo@example.com';
  // Login to get session
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123', // usually demo pass, or we can just bypass
  });
  
  if (authError) {
    console.error('Auth error:', authError);
    return;
  }
  
  const { data, error } = await supabase.rpc('get_monthly_summary', { p_date: '2026-09-06' });
  
  if (error) {
    console.error('RPC Error:', error);
    return;
  }
  
  console.log('Result:', JSON.stringify(data, null, 2));
  console.log('typeof total_mes:', typeof data.total_mes);
  console.log('typeof saldo:', typeof data.saldo);
  if (data.por_categoria && data.por_categoria.length > 0) {
    console.log('typeof por_categoria[0].total:', typeof data.por_categoria[0].total);
  }
}

main();
