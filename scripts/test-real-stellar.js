import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

async function testRealStellar() {
  console.log('🌟 Testando transações reais do Stellar...');
  
  try {
    const testWallet = 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E';
    const secretKey = 'SAWIQZJL2YPFWHP4XSKTLGWCZUW7MXWGLXMAY7STMHINCB6IXQZVXFWM';
    
    console.log('📡 Enviando prompt com chave secreta...');
    const response = await axios.post(`${API_BASE}/ai/completions`, {
      walletAddress: testWallet,
      prompt: 'Teste de transação real do Stellar',
      secretKey: secretKey
    });
    
    console.log('✅ Resposta recebida:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Resposta: ${response.data.response?.substring(0, 100)}...`);
    console.log(`   Custo: ${response.data.cost} XLM`);
    console.log(`   Tokens: ${response.data.tokens}`);
    console.log(`   Saldo restante: ${response.data.balanceAfter} XLM`);
    
    // Aguardar um pouco e verificar histórico
    console.log('\n⏳ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('📋 Verificando histórico...');
    const historyResponse = await axios.get(`${API_BASE}/usage`, {
      params: {
        walletAddress: testWallet,
        limit: 5,
        offset: 0,
        period: 'all'
      }
    });
    
    console.log('✅ Histórico:');
    console.log(`   Total: ${historyResponse.data.total || 0}`);
    console.log(`   Registros: ${historyResponse.data.usage?.length || 0}`);
    
    if (historyResponse.data.usage && historyResponse.data.usage.length > 0) {
      const first = historyResponse.data.usage[0];
      console.log('📝 Último registro:');
      console.log(`   ID: ${first.id}`);
      console.log(`   Prompt: ${first.prompt_preview}...`);
      console.log(`   Tokens: ${first.tokens_est}`);
      console.log(`   Custo: ${first.cost_amount} XLM`);
      console.log(`   Data: ${first.created_at}`);
      console.log(`   Hash: ${first.tx_hash}`);
      
      // Verificar se é hash real ou demo
      if (first.tx_hash.startsWith('demo_')) {
        console.log('⚠️ Hash simulado (demo)');
      } else {
        console.log('✅ Hash real do Stellar!');
        console.log(`🔗 Link: https://testnet.stellarchain.io/tx/${first.tx_hash}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar Stellar real:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensagem: ${error.response.data?.error || error.message}`);
    } else {
      console.error(`   Erro: ${error.message}`);
    }
  }
}

testRealStellar();
