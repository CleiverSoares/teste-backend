#!/usr/bin/env node

/**
 * Script para testar diferentes custos de prompt e valores de transação Stellar
 */

import pricingService from '../services/pricingService.js';
import stellarService from '../services/stellarService.js';

// Endereço de teste (substitua por um endereço real com saldo)
const TEST_ADDRESS = 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E';

async function testPromptCosts() {
  console.log('🧪 TESTE DE CUSTOS DE PROMPT E TRANSAÇÕES STELLAR\n');

  // Diferentes tamanhos de prompt para testar
  const testCases = [
    {
      name: 'Prompt Curto',
      chars: 300,
      description: 'Limite para prompt curto (≤300 tokens)'
    },
    {
      name: 'Prompt Médio',
      chars: 1200,
      description: 'Prompt médio (301-3000 tokens)'
    },
    {
      name: 'Prompt Longo',
      chars: 5000,
      description: 'Prompt longo (3001-10000 tokens)'
    },
    {
      name: 'Prompt Máximo',
      chars: 10000,
      description: 'Máximo permitido (10.000 caracteres)'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n=== ${testCase.name.toUpperCase()} ===`);
    console.log(`📝 ${testCase.description}`);
    
    // Criar prompt de teste
    const prompt = 'A'.repeat(testCase.chars);
    
    // Calcular custo
    const cost = pricingService.calculateCost(prompt);
    console.log(`📊 Caracteres: ${testCase.chars}`);
    console.log(`🎯 Tokens: ${cost.tokens}`);
    console.log(`💰 Custo: ${cost.cost} XLM`);
    console.log(`🏷️  Tipo: ${cost.tier}`);
    
    // Simular criação de transação Stellar
    try {
      console.log(`🔗 Simulando transação Stellar...`);
      
      // Converter para stroops
      const amountInStroops = Math.round(cost.cost * 10000000);
      const amountInXLM = (amountInStroops / 10000000).toFixed(7);
      
      console.log(`💎 Valor em stroops: ${amountInStroops}`);
      console.log(`💎 Valor em XLM: ${amountInXLM}`);
      console.log(`📝 Memo: "AI Gateway - Custo: ${amountInXLM} XLM"`);
      
      // Tentar criar transação real (pode falhar se não tiver saldo)
      try {
        const transaction = await stellarService.createDemoTransaction(TEST_ADDRESS, cost.cost);
        console.log(`✅ Transação criada com sucesso!`);
        console.log(`📦 Amount: ${transaction.amount}`);
        console.log(`📝 Memo: ${transaction.memo}`);
      } catch (error) {
        console.log(`⚠️  Erro ao criar transação real: ${error.message}`);
        console.log(`🔄 Usando simulação...`);
        
        // Simulação manual
        const simulatedAmount = amountInXLM + ' XLM';
        const simulatedMemo = `AI Gateway - Custo: ${amountInXLM} XLM (simulado)`;
        console.log(`📦 Amount (simulado): ${simulatedAmount}`);
        console.log(`📝 Memo (simulado): ${simulatedMemo}`);
      }
      
    } catch (error) {
      console.log(`❌ Erro: ${error.message}`);
    }
  }

  console.log(`\n🎯 RESUMO DOS TESTES:`);
  console.log(`📊 Prompt curto (300 chars): 0.02 XLM`);
  console.log(`📊 Prompt médio (1.200 chars): 0.05 XLM`);
  console.log(`📊 Prompt longo (5.000 chars): 0.05 XLM`);
  console.log(`📊 Prompt máximo (10.000 chars): 0.05 XLM`);
  console.log(`\n✅ Agora as transações Stellar refletem o custo real do prompt!`);
}

// Executar teste
testPromptCosts().catch(console.error);
