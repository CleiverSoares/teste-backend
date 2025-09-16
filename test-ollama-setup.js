import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

console.log('🤖 === TESTANDO CONFIGURAÇÃO OLLAMA ===');
console.log('🎯 Verificando se Ollama está funcionando para chat');

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

setTimeout(async () => {
  console.log('\n1️⃣ === VERIFICANDO SE OLLAMA ESTÁ RODANDO ===');
  
  try {
    const healthResponse = await fetch(`${OLLAMA_URL}/api/tags`, {
      timeout: 5000
    });

    if (healthResponse.ok) {
      const data = await healthResponse.json();
      console.log('✅ Ollama está rodando!');
      console.log('📦 Modelos disponíveis:', data.models?.length || 0);
      
      if (data.models && data.models.length > 0) {
        data.models.forEach((model, index) => {
          console.log(`   ${index + 1}. ${model.name} (${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)`);
        });
      }
      
      // Verificar se o modelo configurado existe
      const hasModel = data.models?.some(m => m.name.includes(OLLAMA_MODEL.split(':')[0]));
      if (hasModel) {
        console.log(`✅ Modelo ${OLLAMA_MODEL} encontrado!`);
      } else {
        console.log(`⚠️ Modelo ${OLLAMA_MODEL} não encontrado`);
        console.log(`💡 Execute: ollama pull ${OLLAMA_MODEL}`);
      }
      
    } else {
      console.log('❌ Ollama não está respondendo');
    }
    
  } catch (error) {
    console.log('❌ Ollama não está rodando:', error.message);
    console.log('\n📋 INSTRUÇÕES PARA INSTALAR:');
    console.log('1. Baixe: https://ollama.ai/download/windows');
    console.log('2. Execute: ollama pull llama3.2:1b');
    console.log('3. Teste: ollama run llama3.2:1b "Olá"');
    return;
  }
  
  console.log('\n2️⃣ === TESTANDO CONVERSA COM IA ===');
  
  try {
    const prompt = 'Olá! Responda de forma breve e amigável.';
    
    const aiResponse = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 100,
          top_k: 40,
          top_p: 0.9
        }
      }),
      timeout: 30000
    });

    if (aiResponse.ok) {
      const aiData = await aiResponse.json();
      console.log('✅ IA respondeu com sucesso!');
      console.log('🤖 Resposta:', aiData.response);
      console.log('⚡ Tempo:', aiData.total_duration ? `${(aiData.total_duration / 1000000).toFixed(0)}ms` : 'N/A');
      console.log('🧠 Tokens:', aiData.eval_count || 'N/A');
      
    } else {
      console.log('❌ Erro na resposta da IA:', aiResponse.status);
    }
    
  } catch (error) {
    console.log('❌ Erro ao testar IA:', error.message);
  }
  
  console.log('\n3️⃣ === TESTANDO CHAT COMPLETO ===');
  
  try {
    // Simular uma conversa completa
    const chatResponse = await fetch('http://localhost:3001/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletAddress: 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E',
        title: 'Teste Ollama Local'
      })
    });

    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      const conversationId = chatData.conversation.id;
      
      console.log('✅ Conversa criada:', conversationId);
      
      // Enviar mensagem
      const messageResponse = await fetch(`http://localhost:3001/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E',
          message: 'Olá! Me conte uma curiosidade interessante em poucas palavras.',
          secretKey: 'SAWIQZJL2YPFWHP4XSKTLGWCZUW7MXWGLXMAY7STMHINCB6IXQZVXFWM'
        })
      });

      if (messageResponse.ok) {
        const messageData = await messageResponse.json();
        console.log('✅ Chat funcionando com Ollama!');
        console.log('💬 Mensagens:', messageData.messages?.length || 0);
        console.log('💰 Custo:', messageData.cost, 'XLM');
        console.log('🔗 TX Hash:', messageData.txHash?.substring(0, 12) + '...');
        
        if (messageData.messages && messageData.messages.length >= 2) {
          const aiMessage = messageData.messages[1];
          console.log('🤖 IA disse:', aiMessage.content.substring(0, 100) + '...');
        }
        
      } else {
        console.log('❌ Erro no chat:', messageResponse.status);
      }
      
    } else {
      console.log('❌ Erro ao criar conversa');
    }
    
  } catch (error) {
    console.log('❌ Erro no teste de chat:', error.message);
  }
  
  console.log('\n🎉 === RESULTADO FINAL ===');
  console.log('✅ Se tudo funcionou, seu chat está pronto!');
  console.log('💬 Acesse: http://localhost:5173/studio');
  console.log('🤖 A IA local Ollama responderá suas perguntas');
  console.log('💰 E debitará do seu saldo Stellar real!');
  
}, 2000);

console.log('\n📋 VERIFICAÇÕES:');
console.log('🔍 1. Ollama está instalado e rodando?');
console.log('🤖 2. Modelo baixado e funcionando?');
console.log('💬 3. Chat integrado com backend?');
console.log('💰 4. Pagamento Stellar funcionando?');
console.log('⏳ Aguardando 2 segundos...');
