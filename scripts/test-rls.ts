import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

async function run() {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('Creating User A and User B...');
  const { data: userA, error: errA } = await adminClient.auth.admin.createUser({
    email: 'usera@example.com',
    password: 'password123',
    email_confirm: true,
  });
  if (errA) throw errA;

  const { data: userB, error: errB } = await adminClient.auth.admin.createUser({
    email: 'userb@example.com',
    password: 'password123',
    email_confirm: true,
  });
  if (errB) throw errB;

  console.log('Logging in User A...');
  await clientA.auth.signInWithPassword({ email: 'usera@example.com', password: 'password123' });

  console.log('Logging in User B...');
  await clientB.auth.signInWithPassword({ email: 'userb@example.com', password: 'password123' });

  console.log('User A inserting a transaction...');
  const { data: tx, error: txErr } = await clientA.from('transactions').insert({
    user_id: userA.user.id,
    valor: 100,
    tipo: 'despesa',
    categoria: 'alimentacao',
    data: '2026-09-04',
    descricao: 'Test transaction',
    origem: 'chat',
    client_message_id: '123e4567-e89b-12d3-a456-426614174000'
  }).select();

  if (txErr) {
    console.error('Failed to insert tx as User A:', txErr);
  } else {
    console.log('Inserted TX by User A successfully.');
  }

  console.log('Testing idempotency: User A inserts same client_message_id...');
  const { error: dupErr } = await clientA.from('transactions').insert({
    user_id: userA.user.id,
    valor: 50,
    tipo: 'despesa',
    categoria: 'lazer',
    data: '2026-09-04',
    descricao: 'Duplicate message id',
    origem: 'chat',
    client_message_id: '123e4567-e89b-12d3-a456-426614174000'
  });
  if (dupErr) {
    console.log('SUCCESS: Duplicate insert failed with error:', dupErr.code);
  } else {
    console.error('FAILED: Duplicate insert succeeded when it should have failed.');
  }

  console.log('User B selecting transactions...');
  const { data: results, error: selErr } = await clientB.from('transactions').select('*');
  if (selErr) {
    console.error('Select error:', selErr);
  } else {
    console.log('User B found transactions count:', results.length);
    if (results.length === 0) {
      console.log('SUCCESS: RLS is isolating records correctly!');
    } else {
      console.error('FAILED: RLS is broken! User B saw User A data.');
    }
  }

  console.log('Checking row level security on tables...');
  const { data: rlsCheck } = await adminClient.rpc('check_rls'); // we can do a raw query, or just assume testing is enough
}

run().catch(console.error);
