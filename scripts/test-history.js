import axios from 'axios';

const API_BASE = 'http://localhost:3001/api';

async function testHistory() {
  console.log('🧪 Testando API de histórico...');
  
  try {
    // Testar com usuário de teste
    const testWallet = 'GDR2Z3OBCROE4J2TZ223TRS62BFKHRJTCWSD5H2ANXCDBVYO6VGNNW26';
    
    console.log('📡 Testando GET /usage com período "all"...');
    const response = await axios.get(`${API_BASE}/usage`, {
      params: {
        walletAddress: testWallet,
        limit: 20,
        offset: 0,
        period: 'all'
      }
    });
    
    console.log('✅ Resposta recebida:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Total: ${response.data.total || 0}`);
    console.log(`   Usage: ${response.data.usage?.length || 0} registros`);
    
    if (response.data.usage && response.data.usage.length > 0) {
      console.log('📋 Primeiro registro:');
      const first = response.data.usage[0];
      console.log(`   ID: ${first.id}`);
      console.log(`   Prompt: ${first.prompt_preview}...`);
      console.log(`   Tokens: ${first.tokens_est}`);
      console.log(`   Custo: ${first.cost_amount} XLM`);
      console.log(`   Data: ${first.created_at}`);
      console.log(`   Hash: ${first.tx_hash || 'N/A'}`);
    }
    
  } catch (error) {
    console.error('❌ Erro ao testar histórico:');
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Mensagem: ${error.response.data?.error || error.message}`);
    } else {
      console.error(`   Erro: ${error.message}`);
    }
  }
}

testHistory();
