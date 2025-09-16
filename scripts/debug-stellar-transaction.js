#!/usr/bin/env node

/**
 * Script para debugar transações Stellar
 */

import stellarService from '../services/stellarService.js';
import pricingService from '../services/pricingService.js';

const TEST_ADDRESS = 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E';
const TEST_SECRET = 'SAWIQZJL2YPFWHP4XSKTLGWCZUW7MXWGLXMAY7STMHINCB6IXQZVXFWM';

async function debugStellarTransaction() {
  console.log('🔍 DEBUG: TRANSAÇÕES STELLAR\n');

  try {
    // 1. Testar validação de endereço
    console.log('1️⃣ Validando endereço...');
    const isValid = stellarService.isValidStellarAddress(TEST_ADDRESS);
    console.log(`   Endereço válido: ${isValid}`);

    // 2. Testar validação de chave secreta
    console.log('\n2️⃣ Validando chave secreta...');
    try {
      const keypair = stellarService.StellarSdk.Keypair.fromSecret(TEST_SECRET);
      console.log(`   Chave pública: ${keypair.publicKey()}`);
      console.log(`   Chaves correspondem: ${keypair.publicKey() === TEST_ADDRESS}`);
    } catch (error) {
      console.log(`   ❌ Erro na chave: ${error.message}`);
    }

    // 3. Testar cálculo de custo
    console.log('\n3️⃣ Calculando custo do prompt...');
    const testPrompt = 'A'.repeat(1000); // 1000 caracteres
    const cost = pricingService.calculateCost(testPrompt);
    console.log(`   Prompt: ${testPrompt.length} caracteres`);
    console.log(`   Custo: ${cost.cost} XLM`);
    console.log(`   Tokens: ${cost.tokens}`);
    console.log(`   Tier: ${cost.tier}`);

    // 4. Testar criação de transação
    console.log('\n4️⃣ Criando transação...');
    try {
      const transaction = await stellarService.createDemoTransaction(TEST_ADDRESS, cost.cost);
      console.log(`   ✅ Transação criada com sucesso!`);
      console.log(`   Amount: ${transaction.amount}`);
      console.log(`   Memo: ${transaction.memo}`);
      console.log(`   XDR length: ${transaction.transactionXDR?.length}`);
      console.log(`   Needs signature: ${transaction.needsSignature}`);

      // 5. Testar assinatura
      console.log('\n5️⃣ Assinando transação...');
      try {
        const signResult = await stellarService.signAndSubmitTransaction(transaction.transactionXDR, TEST_SECRET);
        console.log(`   ✅ Transação assinada com sucesso!`);
        console.log(`   Hash: ${signResult.txHash}`);
        console.log(`   Success: ${signResult.success}`);
      } catch (signError) {
        console.log(`   ❌ Erro na assinatura: ${signError.message}`);
        console.log(`   Stack: ${signError.stack}`);
      }

    } catch (createError) {
      console.log(`   ❌ Erro na criação: ${createError.message}`);
      console.log(`   Stack: ${createError.stack}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar debug
debugStellarTransaction().catch(console.error);
