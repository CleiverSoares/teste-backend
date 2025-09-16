import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

async function simulateAIRequest() {
  console.log('🤖 Simulando requisição de IA...');
  
  try {
    const testWallet = 'GDR2Z3OBCROE4J2TZ223TRS62BFKHRJTCWSD5H2ANXCDBVYO6VGNNW26';
    
    console.log('📡 Enviando prompt para IA...');
    const response = await axios.post(`${API_BASE}/ai/completions`, {
      walletAddress: testWallet,
      prompt: 'Olá, como você está?'
    });
    
    console.log('✅ Resposta recebida:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Resposta: ${response.data.response?.substring(0, 100)}...`);
    console.log(`   Custo: ${response.data.cost} XLM`);
    console.log(`   Tokens: ${response.data.tokens}`);
    console.log(`   Saldo restante: ${response.data.balanceAfter} XLM`);
    
    // Aguardar um pouco e verificar histórico
    console.log('\n⏳ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('📋 Verificando histórico...');
    const historyResponse = await axios.get(`${API_BASE}/usage`, {
      params: {
        walletAddress: testWallet,
        limit: 10,
        offset: 0,
        period: 'all'
      }
    });
    
    console.log('✅ Histórico:');
    console.log(`   Total: ${historyResponse.data.total || 0}`);
    console.log(`   Registros: ${historyResponse.data.usage?.length || 0}`);
    
    if (historyResponse.data.usage && historyResponse.data.usage.length > 0) {
      const first = historyResponse.data.usage[0];
      console.log('📝 Primeiro registro:');
      console.log(`   ID: ${first.id}`);
      console.log(`   Prompt: ${first.prompt_preview}...`);
      console.log(`   Tokens: ${first.tokens_est}`);
      console.log(`   Custo: ${first.cost_amount} XLM`);
      console.log(`   Data: ${first.created_at}`);
      console.log(`   Hash: ${first.tx_hash || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao simular requisição:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensagem: ${error.response.data?.error || error.message}`);
    } else {
      console.error(`   Erro: ${error.message}`);
    }
  }
}

simulateAIRequest();
