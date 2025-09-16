import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const DB_PATH = process.env.DB_PATH || './data/ai-gateway.db';

// Criar diretório se não existir
mkdirSync(dirname(DB_PATH), { recursive: true });

// Conectar ao banco
const db = new Database(DB_PATH);

// Habilitar WAL mode para melhor performance
db.pragma('journal_mode = WAL');

console.log('🗄️  Inicializando banco de dados...');

// Criar tabelas
const createTables = `
  -- Tabela de usuários
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    name TEXT,
    email TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  -- Tabela de créditos
  CREATE TABLE IF NOT EXISTS credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    asset TEXT NOT NULL DEFAULT 'XLM',
    balance REAL NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE (user_id, asset)
  );

  -- Tabela de logs de uso
  CREATE TABLE IF NOT EXISTS usage_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    prompt_hash TEXT NOT NULL,
    prompt_preview TEXT NOT NULL,
    tokens_est INTEGER NOT NULL,
    cost_asset TEXT NOT NULL DEFAULT 'XLM',
    cost_amount REAL NOT NULL,
    response_preview TEXT,
    tx_hash TEXT,
    status TEXT DEFAULT 'completed',
    execution_time INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  -- Tabela de conversas
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT,
    last_message_at TEXT DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );

  -- Tabela de mensagens
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    tokens INTEGER,
    cost_amount REAL DEFAULT 0,
    cost_asset TEXT DEFAULT 'XLM',
    tx_hash TEXT,
    execution_time INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
  );

  -- Índices para performance
  CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
  CREATE INDEX IF NOT EXISTS idx_credits_user ON credits(user_id);
  CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id);
  CREATE INDEX IF NOT EXISTS idx_usage_created ON usage_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
  CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(last_message_at);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
  CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
`;

// Executar criação das tabelas
db.exec(createTables);

// Inserir dados de exemplo (opcional para desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Inserindo dados de exemplo...');
  
  const insertExampleData = db.prepare(`
    INSERT OR IGNORE INTO users (wallet_address, name, bio) 
    VALUES (?, ?, ?)
  `);
  
  const insertCredits = db.prepare(`
    INSERT OR IGNORE INTO credits (user_id, asset, balance)
    VALUES (?, ?, ?)
  `);
  
  // Usuário de exemplo com chave real do Stellar testnet
  const result = insertExampleData.run(
    'GABRVJFNHAH4JMDDTEOJHRRYTVO7SAEW64G2O5UIVMA64AZTUISJP53E',
    'Usuário Demo',
    'Conta de demonstração para testes com chave real do Stellar testnet'
  );
  
  if (result.changes > 0) {
    insertCredits.run(result.lastInsertRowid, 'XLM', 1.0);
  }
}

console.log('✅ Banco de dados inicializado com sucesso!');
console.log(`📁 Localização: ${DB_PATH}`);

db.close();
