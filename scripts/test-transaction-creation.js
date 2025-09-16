import stellarService from '../services/stellarService.js';

async function testTransactionCreation() {
  console.log('🧪 Testando criação de transação...');
  
  try {
    const walletAddress = 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E';
    
    console.log('📍 Endereço:', walletAddress);
    console.log('🔗 Criando transação...');
    
    const result = await stellarService.createDemoTransaction(walletAddress);
    
    console.log('✅ Transação criada:');
    console.log('  transactionXDR:', result.transactionXDR);
    console.log('  transactionXDR type:', typeof result.transactionXDR);
    console.log('  transactionXDR length:', result.transactionXDR?.length);
    console.log('  needsSignature:', result.needsSignature);
    console.log('  amount:', result.amount);
    console.log('  fee:', result.fee);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  }
}

testTransactionCreation();
