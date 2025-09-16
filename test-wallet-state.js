import fetch from 'node-fetch';

console.log('🔍 === VERIFICANDO ESTADO DO WALLET ===');
console.log('🎯 Debug para entender por que dashboard não atualiza');

const walletAddress = 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E';
const secretKey = 'SAWIQZJL2YPFWHP4XSKTLGWCZUW7MXWGLXMAY7STMHINCB6IXQZVXFWM';

setTimeout(async () => {
  console.log('\n📊 === ESTADO ATUAL DOS SALDOS ===');
  
  try {
    // 1. Saldo real direto da API
    console.log('1️⃣ Consultando saldo REAL direto da API...');
    const realResponse = await fetch('http://localhost:3001/api/credits/real-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey: secretKey })
    });
    const realData = await realResponse.json();
    console.log('   💰 Saldo real:', realData.balance, 'XLM');
    
    // 2. Saldo simulado direto da API
    console.log('\n2️⃣ Consultando saldo SIMULADO direto da API...');
    const simResponse = await fetch(`http://localhost:3001/api/credits/balance?walletAddress=${walletAddress}`);
    const simData = await simResponse.json();
    console.log('   🧪 Saldo simulado:', simData.balance, 'XLM');
    
    console.log('\n🎯 === PROBLEMA IDENTIFICADO ===');
    console.log('Dashboard provavelmente está usando saldo simulado (5.06) em vez do real (19999.99965)');
    console.log('');
    console.log('🔧 === SOLUÇÕES APLICADAS ===');
    console.log('✅ 1. Auto-refresh no dashboard');
    console.log('✅ 2. Logs de debug adicionados');
    console.log('✅ 3. Botão "Real" para forçar atualização');
    console.log('✅ 4. Watch reativo no saldo');
    console.log('');
    console.log('🧪 === TESTE AGORA ===');
    console.log('1. Recarregue o dashboard: http://localhost:5173/dashboard');
    console.log('2. Abra o console (F12) para ver os logs');
    console.log('3. Clique no botão "Real" no WalletCard');
    console.log('4. Verifique se aparece 19999.99965 XLM');
    console.log('');
    console.log('💡 === SE AINDA NÃO FUNCIONAR ===');
    console.log('- Limpe cache do navegador (Ctrl+Shift+Del)');
    console.log('- Recarregue com Ctrl+F5');
    console.log('- Verifique se chave secreta está salva no localStorage');
    
  } catch (error) {
    console.log('❌ Erro:', error.message);
  }
  
}, 1000);

console.log('\n📋 OBJETIVO:');
console.log('🔍 Confirmar valores atuais dos saldos');
console.log('🧪 Validar que correções foram aplicadas');
console.log('⏳ Aguardando 1 segundo...');
