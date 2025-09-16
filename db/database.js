import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './data/ai-gateway.db';

// Criar diretório se não existir
mkdirSync(dirname(DB_PATH), { recursive: true });

// Singleton para conexão com o banco
let db = null;

export function getDatabase() {
  if (!db) {
    db = new Database(DB_PATH);
    
    // Configurações de performance
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('cache_size = 1000');
    db.pragma('temp_store = MEMORY');
    
    console.log(`📊 Conectado ao banco: ${DB_PATH}`);
  }
  
  return db;
}

// Fechar conexão (para testes ou shutdown)
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('🔒 Conexão com banco fechada');
  }
}

// Queries preparadas para performance
export const queries = {
  // Usuários
  getUserByWallet: null,
  createUser: null,
  updateUser: null,
  
  // Créditos
  getBalance: null,
  updateBalance: null,
  createBalance: null,
  
  // Logs de uso
  insertUsageLog: null,
  getUserUsage: null,
  getUsageStats: null,
};

// Inicializar queries preparadas
export function initQueries() {
  const database = getDatabase();
  
  // Usuários
  queries.getUserByWallet = database.prepare(`
    SELECT * FROM users WHERE wallet_address = ?
  `);
  
  queries.createUser = database.prepare(`
    INSERT INTO users (wallet_address, name, email, bio, avatar_url)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  queries.updateUser = database.prepare(`
    UPDATE users 
    SET name = ?, email = ?, bio = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  // Créditos
  queries.getBalance = database.prepare(`
    SELECT c.*, u.wallet_address 
    FROM credits c
    JOIN users u ON c.user_id = u.id
    WHERE u.wallet_address = ? AND c.asset = ?
  `);
  
  queries.updateBalance = database.prepare(`
    UPDATE credits 
    SET balance = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ? AND asset = ?
  `);
  
  queries.createBalance = database.prepare(`
    INSERT INTO credits (user_id, asset, balance)
    VALUES (?, ?, ?)
  `);

  queries.updateAllBalances = database.prepare(`
    UPDATE credits 
    SET balance = ?, updated_at = CURRENT_TIMESTAMP
    WHERE asset = ?
  `);
  
  // Logs de uso
  queries.insertUsageLog = database.prepare(`
    INSERT INTO usage_logs (
      user_id, prompt_hash, prompt_preview, tokens_est, 
      cost_asset, cost_amount, response_preview, 
      tx_hash, status, execution_time
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  queries.getUserUsage = database.prepare(`
    SELECT ul.*, u.wallet_address
    FROM usage_logs ul
    JOIN users u ON ul.user_id = u.id
    WHERE u.wallet_address = ?
    ORDER BY ul.created_at DESC
    LIMIT ? OFFSET ?
  `);
  
  queries.getUsageStats = database.prepare(`
    SELECT 
      COUNT(*) as total_requests,
      SUM(cost_amount) as total_cost,
      AVG(execution_time) as avg_execution_time
    FROM usage_logs ul
    JOIN users u ON ul.user_id = u.id
    WHERE u.wallet_address = ?
      AND ul.created_at >= datetime('now', '-30 days')
  `);

  // Conversas
  queries.createConversation = database.prepare(`
    INSERT INTO conversations (user_id, title)
    VALUES (?, ?)
  `);

  queries.getUserConversations = database.prepare(`
    SELECT c.*, 
           (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as message_count,
           (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) as last_message
    FROM conversations c
    JOIN users u ON c.user_id = u.id
    WHERE u.wallet_address = ?
    ORDER BY c.last_message_at DESC
    LIMIT ? OFFSET ?
  `);

  queries.getConversation = database.prepare(`
    SELECT c.*, u.wallet_address
    FROM conversations c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ? AND u.wallet_address = ?
  `);

  queries.updateConversationTitle = database.prepare(`
    UPDATE conversations 
    SET title = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  queries.updateConversationLastMessage = database.prepare(`
    UPDATE conversations 
    SET last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);

  queries.deleteConversation = database.prepare(`
    DELETE FROM conversations WHERE id = ?
  `);

  // Mensagens
  queries.insertMessage = database.prepare(`
    INSERT INTO messages (
      conversation_id, role, content, tokens, 
      cost_amount, cost_asset, tx_hash, execution_time
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  queries.getConversationMessages = database.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at ASC
  `);

  queries.getLastMessages = database.prepare(`
    SELECT * FROM messages
    WHERE conversation_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `);

  queries.deleteMessage = database.prepare(`
    DELETE FROM messages WHERE id = ?
  `);

  queries.updateUsageLogTxHash = database.prepare(`
    UPDATE usage_logs 
    SET tx_hash = ?
    WHERE id = ? AND user_id = ?
  `);

  queries.getUsageLogsWithTxHash = database.prepare(`
    SELECT ul.*, u.wallet_address
    FROM usage_logs ul
    JOIN users u ON ul.user_id = u.id
    WHERE u.wallet_address = ? AND ul.tx_hash IS NOT NULL
    ORDER BY ul.created_at DESC
  `);

  queries.getAllUsers = database.prepare(`SELECT * FROM users`);
  queries.getAllCredits = database.prepare(`SELECT * FROM credits`);
  queries.getUserCredits = database.prepare(`SELECT * FROM credits WHERE user_id = ?`);
  queries.updateBalance = database.prepare(`UPDATE credits SET balance = ? WHERE user_id = ? AND asset = ?`);
  queries.getAllUsageLogs = database.prepare(`SELECT * FROM usage_logs ORDER BY created_at DESC`);
}

// Auto-inicializar quando o módulo é importado
initQueries();

export default getDatabase;
