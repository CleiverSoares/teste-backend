import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Importar rotas
import authRoutes from './routes/auth.js';
import creditsRoutes from './routes/credits.js';
import aiRoutes from './routes/ai.js';
import usageRoutes from './routes/usage.js';
import stellarRoutes from './routes/stellar.js';
import transactionRoutes from './routes/transactions.js';
import conversationsRoutes from './routes/conversations.js';

// Configuração
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));

// Rate limiting removido para desenvolvimento

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/stellar', stellarRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/conversations', conversationsRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON inválido',
      code: 'INVALID_JSON'
    });
  }
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR'
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    code: 'NOT_FOUND'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/health`);
  console.log(`🤖 AI Provider: ${process.env.AI_PROVIDER || 'ollama'}`);
  console.log(`⭐ Stellar Network: ${process.env.STELLAR_NETWORK || 'testnet'}`);
});

export default app;
