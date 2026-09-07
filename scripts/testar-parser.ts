import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Helper to calculate MAE
const calculateMAE = (actual: number, expected: number) => Math.abs(actual - expected);

async function main() {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Try to sign in as user A (created in test-rls)
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: 'usera@example.com',
    password: 'password123'
  });

  let jwt = process.env.SUPABASE_ANON_KEY;
  if (authData?.session?.access_token) {
    jwt = authData.session.access_token;
  } else {
    console.warn("Could not authenticate, trying to proceed with anon key or env... ", authErr?.message);
  }
  const datasetPath = path.join(process.cwd(), 'scripts', 'dataset.json');
  const datasetRaw = fs.readFileSync(datasetPath, 'utf8');
  const dataset = JSON.parse(datasetRaw);

  let correctIntent = 0;
  let correctCategory = 0;
  let totalCategoryChecks = 0;
  let totalErrorVal = 0;
  let totalValChecks = 0;

  const failures: any[] = [];
  const today = '2026-09-04'; // Fixed for testing dates
  
  console.log(`Running harness for ${dataset.length} cases...`);

  for (const item of dataset) {
    try {
      const response = await fetch('http://127.0.0.1:54321/functions/v1/interpretar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify({
          texto: item.texto,
          dataCliente: today,
          timezone: 'America/Sao_Paulo',
          client_message_id: 'test-' + Math.random().toString(36).substring(7)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} ${await response.text()}`);
      }

      const result = await response.json();
      let passed = true;
      let reason = '';

      // Check Intent
      if (result.intencao === item.esperado.intencao) {
        correctIntent++;
      } else {
        passed = false;
        reason += `Intent mismatch (expected ${item.esperado.intencao}, got ${result.intencao}). `;
      }

      // Check specific expectations for 'registrar'
      if (item.esperado.intencao === 'registrar') {
        const expectedCount = item.esperado.transacoes_count || (item.esperado.pergunta ? 1 : 0);
        if (result.transacoes.length !== expectedCount && !item.esperado.pergunta) {
           // if question expected, sometimes transacoes might be returned with null or empty array.
           // according to prompt rules, return transacoes with null value, and pergunta
           if (!(item.esperado.pergunta && result.pergunta)) {
             passed = false;
             reason += `Transactions count mismatch (expected ${expectedCount}, got ${result.transacoes.length}). `;
           }
        }

        if (item.esperado.pergunta) {
          if (!result.pergunta) {
            passed = false;
            reason += `Expected a question but got none. `;
          }
        }

        if (item.esperado.valorNulo && result.transacoes.length > 0) {
          if (result.transacoes[0].valor !== null) {
            passed = false;
            reason += `Expected null value for implicit transaction, got ${result.transacoes[0].valor}. `;
          }
        }

        if (item.esperado.categorias && result.transacoes.length > 0) {
          let catPass = true;
          for (let i = 0; i < item.esperado.categorias.length; i++) {
            totalCategoryChecks++;
            if (result.transacoes[i] && result.transacoes[i].categoria === item.esperado.categorias[i]) {
              correctCategory++;
            } else {
              catPass = false;
            }
          }
          if (!catPass) {
            passed = false;
            reason += `Categories mismatch. `;
          }
        } else if (item.esperado.categoria && result.transacoes.length > 0) {
          totalCategoryChecks++;
          if (result.transacoes[0].categoria === item.esperado.categoria) {
            correctCategory++;
          } else {
            passed = false;
            reason += `Category mismatch (expected ${item.esperado.categoria}, got ${result.transacoes[0].categoria}). `;
          }
        }

        if (item.esperado.valores && result.transacoes.length > 0) {
          for (let i = 0; i < item.esperado.valores.length; i++) {
            totalValChecks++;
            if (result.transacoes[i] && result.transacoes[i].valor !== null) {
              totalErrorVal += calculateMAE(result.transacoes[i].valor, item.esperado.valores[i]);
            }
          }
        } else if (item.esperado.valor !== undefined && result.transacoes.length > 0 && result.transacoes[0].valor !== null) {
          totalValChecks++;
          totalErrorVal += calculateMAE(result.transacoes[0].valor, item.esperado.valor);
        }
      }

      if (!passed) {
        failures.push({
          texto: item.texto,
          expected: item.esperado,
          actual: result,
          reason
        });
      }

    } catch (error: any) {
      failures.push({
        texto: item.texto,
        error: error.message
      });
    }
  }

  const intentAcc = (correctIntent / dataset.length) * 100;
  const catAcc = totalCategoryChecks > 0 ? (correctCategory / totalCategoryChecks) * 100 : 100;
  const mae = totalValChecks > 0 ? (totalErrorVal / totalValChecks) : 0;

  console.log('--- TEST RESULTS ---');
  console.log(`Intent Accuracy: ${intentAcc.toFixed(2)}%`);
  console.log(`Category Accuracy: ${catAcc.toFixed(2)}%`);
  console.log(`Value MAE: ${mae.toFixed(2)}`);
  
  if (failures.length > 0) {
    console.log('\n--- FAILURES ---');
    failures.forEach((f, i) => {
      console.log(`${i + 1}. Text: "${f.texto}"`);
      if (f.error) {
        console.log(`   Error: ${f.error}`);
      } else {
        console.log(`   Reason: ${f.reason}`);
        console.log(`   Expected:`, f.expected);
        console.log(`   Actual:`, f.actual);
      }
      console.log('------------------');
    });
  } else {
    console.log('\nAll tests passed successfully!');
  }
}

main();
