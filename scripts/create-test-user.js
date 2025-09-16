import { queries } from '../db/database.js';

console.log('🧪 Criando usuário de teste...');

try {
  // Endereço Stellar de teste
  const testWalletAddress = 'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E';
  
  // Verificar se usuário já existe
  const existingUser = queries.getUserByWallet.get(testWalletAddress);
  if (existingUser) {
    console.log('👤 Usuário de teste já existe:', existingUser.wallet_address);
    
    // Verificar créditos
    const credits = queries.getUserCredits.all(existingUser.id);
    if (credits.length === 0) {
      console.log('💰 Criando saldo inicial...');
      queries.createBalance.run(existingUser.id, 'XLM', 5.0);
      console.log('✅ Saldo de 5 XLM criado');
    } else {
      console.log('💰 Atualizando saldo para 5 XLM...');
      queries.updateBalance.run(5.0, existingUser.id, 'XLM');
      console.log('✅ Saldo atualizado');
    }
  } else {
    console.log('👤 Criando novo usuário de teste...');
    
    // Criar usuário
    const result = queries.createUser.run(
      testWalletAddress,
      'Usuário Teste',
      'teste@example.com',
      'Usuário para testes do sistema',
      null
    );
    
    const userId = result.lastInsertRowid;
    console.log('✅ Usuário criado com ID:', userId);
    
    // Criar saldo inicial
    queries.createBalance.run(userId, 'XLM', 5.0);
    console.log('✅ Saldo de 5 XLM criado');
  }
  
  console.log('\n🎉 Usuário de teste pronto!');
  console.log('💡 Endereço:', testWalletAddress);
  console.log('💡 Saldo: 5 XLM');
  console.log('💡 Agora você pode fazer login e testar o Studio');

} catch (error) {
  console.error('❌ Erro ao criar usuário de teste:', error);
  process.exit(1);
}

process.exit(0);
