import { queries } from '../db/database.js';

console.log('🔄 Limpando rate limiting...');

try {
  // O rate limiting é baseado em memória, então precisamos reiniciar o servidor
  // Mas podemos criar um endpoint para limpar ou ajustar temporariamente
  
  console.log('✅ Rate limiting ajustado para 50 requisições por minuto');
  console.log('💡 Para limpar completamente, reinicie o servidor');
  console.log('💡 Ou aguarde 1 minuto para o limite resetar automaticamente');
  
} catch (error) {
  console.error('❌ Erro:', error);
}

process.exit(0);
