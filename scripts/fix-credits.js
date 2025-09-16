import { queries } from '../db/database.js';

console.log('🔍 Verificando banco de dados...');

try {
  // Verificar usuários
  const users = queries.getAllUsers.all();
  console.log(`👥 Usuários encontrados: ${users.length}`);
  
  if (users.length === 0) {
    console.log('❌ Nenhum usuário encontrado no banco');
    console.log('💡 Faça login primeiro para criar um usuário');
    process.exit(0);
  }

  // Verificar créditos
  const credits = queries.getAllCredits.all();
  console.log(`💰 Registros de créditos: ${credits.length}`);

  // Verificar cada usuário
  for (const user of users) {
    console.log(`\n👤 Usuário: ${user.wallet_address}`);
    
    const userCredits = queries.getUserCredits.all(user.id);
    console.log(`   Créditos: ${userCredits.length} registros`);
    
    if (userCredits.length === 0) {
      console.log('   ❌ Sem créditos - criando saldo inicial...');
      queries.createBalance.run(user.id, 'XLM', 5.0);
      console.log('   ✅ Saldo de 5 XLM criado');
    } else {
      console.log('   💰 Saldos existentes:');
      for (const credit of userCredits) {
        console.log(`      ${credit.asset}: ${credit.balance}`);
      }
      
      // Atualizar saldo XLM para 5.0 se for menor
      const xlmCredit = userCredits.find(c => c.asset === 'XLM');
      if (xlmCredit && parseFloat(xlmCredit.balance) < 5.0) {
        console.log('   🔄 Atualizando saldo XLM para 5.0...');
        queries.updateBalance.run(5.0, user.id, 'XLM');
        console.log('   ✅ Saldo atualizado');
      }
    }
  }

  console.log('\n🎉 Verificação concluída!');
  console.log('💡 Agora todos os usuários têm saldo suficiente para testar');

} catch (error) {
  console.error('❌ Erro ao verificar banco:', error);
  process.exit(1);
}

process.exit(0);
