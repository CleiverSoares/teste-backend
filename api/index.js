import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Importar rotas (versões mock)
import authRoutes from '../routes/auth.js';
import creditsRoutes from '../routes/credits.js';
import aiRoutes from '../routes/ai.js';
import usageRoutes from '../routes/usage.js';
import stellarRoutes from '../routes/stellar.js';
import conversationsRoutes from '../routes/conversations.js';

// Configuração
dotenv.config();

const app = express();

// Middlewares de segurança
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://hack-meridian-front-end.vercel.app',
        'https://hack-meridian-front.vercel.app',
        'https://ai-gateway-frontend.vercel.app',
        /\.vercel\.app$/
      ]
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-wallet-address']
}));

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de log para debug
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/stellar', stellarRoutes);
app.use('/api/conversations', conversationsRoutes);

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    provider: process.env.AI_PROVIDER || 'mock'
  });
});

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    message: 'AI Gateway API - Vercel Deployment',
    status: 'online',
    endpoints: [
      '/api/health',
      '/api/auth/*',
      '/api/credits/*', 
      '/api/ai/*',
      '/api/usage/*',
      '/api/stellar/*',
      '/api/conversations/*'
    ]
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro na Vercel:', err);
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'JSON inválido',
      code: 'INVALID_JSON'
    });
  }
  
  res.status(500).json({
    error: 'Erro interno do servidor',
    code: 'INTERNAL_ERROR',
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Export para Vercel
export default app;
