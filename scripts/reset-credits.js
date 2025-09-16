import { queries } from '../db/database.js';

console.log('🔄 Resetando créditos de todos os usuários...');

try {
  // Atualizar saldo de todos os usuários para 5 XLM
  const result = queries.updateAllBalances.run(5.0, 'XLM');
  
  console.log(`✅ ${result.changes} usuários atualizados com 5 XLM`);
  console.log('💡 Agora todos os usuários têm saldo suficiente para testar o Studio');
  
} catch (error) {
  console.error('❌ Erro ao resetar créditos:', error);
  process.exit(1);
}

console.log('🎉 Reset concluído!');
process.exit(0);
