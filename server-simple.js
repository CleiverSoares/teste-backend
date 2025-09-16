import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

// Rate limiting
const limiter = rateLimit({
  windowMs: 60000, // 1 minuto
  max: 100, // 100 requests por IP
  message: {
    error: 'Muitas requisições. Tente novamente em alguns momentos.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

app.use(limiter);

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware de log
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Dados mock em memória
const mockDatabase = {
  users: new Map(),
  credits: new Map(),
  usage: new Map()
};

// Utilitários
function isValidStellarAddress(address) {
  if (!address || typeof address !== 'string') return false;
  address = address.trim();
  return /^G[A-Z2-7]{55}$/.test(address) && address.length === 56;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// === ROTAS DA API ===

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0-simple',
    mode: 'mock'
  });
});

// === AUTH ===
app.post('/api/auth/wallet', (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Endereço da carteira é obrigatório',
        code: 'MISSING_WALLET_ADDRESS'
      });
    }

    if (!isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    // Criar/buscar usuário
    let user = mockDatabase.users.get(walletAddress);
    if (!user) {
      user = {
        id: generateId(),
        wallet_address: walletAddress,
        name: 'Usuário Demo',
        email: null,
        bio: 'Conta de demonstração',
        avatar_url: null,
        created_at: new Date().toISOString()
      };
      mockDatabase.users.set(walletAddress, user);
      
      // Criar saldo inicial
      mockDatabase.credits.set(walletAddress, {
        balance: 1.0,
        asset: 'XLM'
      });
    }

    res.json({
      userId: user.id,
      walletAddress: user.wallet_address,
      profile: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarUrl: user.avatar_url
      },
      stellarAccount: { exists: true, balance: 5.0 },
      message: 'Login realizado com sucesso (modo mock)'
    });

  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

app.get('/api/auth/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const user = mockDatabase.users.get(walletAddress);

  if (!user) {
    return res.status(404).json({
      error: 'Usuário não encontrado',
      code: 'USER_NOT_FOUND'
    });
  }

  res.json({
    walletAddress: user.wallet_address,
    profile: {
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatar_url
    }
  });
});

app.put('/api/auth/profile/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  const { name, email, bio, avatarUrl } = req.body;
  const user = mockDatabase.users.get(walletAddress);

  if (!user) {
    return res.status(404).json({
      error: 'Usuário não encontrado',
      code: 'USER_NOT_FOUND'
    });
  }

  // Atualizar dados
  user.name = name || user.name;
  user.email = email || user.email;
  user.bio = bio || user.bio;
  user.avatar_url = avatarUrl || user.avatar_url;

  res.json({
    walletAddress,
    profile: {
      name: user.name,
      email: user.email,
      bio: user.bio,
      avatarUrl: user.avatar_url
    },
    message: 'Perfil atualizado com sucesso'
  });
});

// === CREDITS ===
app.get('/api/credits/balance', (req, res) => {
  const { walletAddress } = req.query;
  
  if (!walletAddress) {
    return res.status(400).json({
      error: 'Endereço da carteira é obrigatório',
      code: 'MISSING_WALLET_ADDRESS'
    });
  }

  const credits = mockDatabase.credits.get(walletAddress) || { balance: 0, asset: 'XLM' };
  
  res.json({
    walletAddress,
    balance: credits.balance,
    asset: credits.asset,
    stats: {
      totalRequests: 5,
      totalCost: 0.25,
      avgExecutionTime: 1500
    },
    formatted: `${credits.balance.toFixed(4)} XLM`
  });
});

app.post('/api/credits/topup', (req, res) => {
  const { walletAddress, amount } = req.body;
  
  if (!walletAddress || !amount) {
    return res.status(400).json({
      error: 'Endereço da carteira e valor são obrigatórios',
      code: 'MISSING_REQUIRED_FIELDS'
    });
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0 || numericAmount > 10) {
    return res.status(400).json({
      error: 'Valor deve ser entre 0.01 e 10 XLM',
      code: 'INVALID_AMOUNT'
    });
  }

  const credits = mockDatabase.credits.get(walletAddress) || { balance: 0, asset: 'XLM' };
  credits.balance += numericAmount;
  mockDatabase.credits.set(walletAddress, credits);

  res.json({
    walletAddress,
    balance: credits.balance,
    added: numericAmount,
    asset: 'XLM',
    formatted: {
      balance: `${credits.balance.toFixed(4)} XLM`,
      added: `${numericAmount.toFixed(4)} XLM`
    },
    message: `${numericAmount.toFixed(4)} XLM adicionados com sucesso (modo mock)`
  });
});

app.get('/api/credits/pricing', (req, res) => {
  res.json({
    short: { price: 0.02, maxTokens: 300, description: 'Prompts curtos e diretos' },
    long: { price: 0.05, minTokens: 301, description: 'Prompts longos e complexos' },
    asset: 'XLM',
    formatted: { short: '0.0200 XLM', long: '0.0500 XLM' }
  });
});

app.post('/api/credits/estimate-cost', (req, res) => {
  const { prompt } = req.body;
  
  if (!prompt) {
    return res.status(400).json({
      error: 'Prompt é obrigatório',
      code: 'MISSING_PROMPT'
    });
  }

  const tokens = Math.ceil(prompt.length / 4);
  const isShort = tokens <= 300;
  const cost = isShort ? 0.02 : 0.05;

  res.json({
    tokens,
    cost,
    tier: isShort ? 'short' : 'long',
    formatted: { cost: `${cost.toFixed(4)} XLM` }
  });
});

// === AI ===
app.post('/api/ai/completions', (req, res) => {
  const { walletAddress, prompt } = req.body;
  
  if (!walletAddress || !prompt) {
    return res.status(400).json({
      error: 'Endereço da carteira e prompt são obrigatórios',
      code: 'MISSING_REQUIRED_FIELDS'
    });
  }

  const credits = mockDatabase.credits.get(walletAddress) || { balance: 0, asset: 'XLM' };
  const tokens = Math.ceil(prompt.length / 4);
  const cost = tokens <= 300 ? 0.02 : 0.05;

  if (credits.balance < cost) {
    return res.status(402).json({
      error: 'Saldo insuficiente',
      code: 'INSUFFICIENT_BALANCE',
      required: cost,
      current: credits.balance
    });
  }

  // Debitar créditos
  credits.balance -= cost;
  mockDatabase.credits.set(walletAddress, credits);

  // Resposta mock
  const responses = [
    `Esta é uma resposta simulada para: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\nEm um ambiente real, esta resposta viria do modelo de IA configurado (Ollama ou OpenAI). Configure o backend completo para ativar IA real.`,
    `Olá! Recebi seu prompt sobre "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}". Esta é uma resposta de demonstração.\n\nPara respostas reais de IA, configure o Ollama localmente ou uma API compatível com OpenAI.`,
    `Prompt processado com sucesso! 🤖\n\nSeu texto: "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"\n\nEsta é uma simulação. Para ativar IA real, verifique a configuração dos serviços de IA.`
  ];

  const response = responses[Math.floor(Math.random() * responses.length)];
  const executionTime = Math.random() * 2000 + 1000;

  // Salvar no histórico
  const usageId = generateId();
  const usage = mockDatabase.usage.get(walletAddress) || [];
  usage.unshift({
    id: usageId,
    promptHash: 'mock_' + Date.now().toString(36),
    promptPreview: prompt.substring(0, 90),
    responsePreview: response.substring(0, 200),
    tokens,
    cost,
    costFormatted: `${cost.toFixed(4)} XLM`,
    asset: 'XLM',
    status: 'completed',
    executionTime: Math.round(executionTime),
    createdAt: new Date().toISOString()
  });
  mockDatabase.usage.set(walletAddress, usage.slice(0, 100)); // Manter só os últimos 100

  res.json({
    response,
    cost,
    tokens,
    tier: tokens <= 300 ? 'short' : 'long',
    balanceAfter: credits.balance,
    executionTime: Math.round(executionTime),
    promptHash: 'mock_' + Date.now().toString(36),
    timestamp: new Date().toISOString()
  });
});

app.get('/api/ai/status', (req, res) => {
  res.json({
    available: false,
    provider: 'mock',
    status: 'Modo mock ativo - configure Ollama para IA real',
    timestamp: new Date().toISOString()
  });
});

// === USAGE ===
app.get('/api/usage', (req, res) => {
  const { walletAddress, limit = 20, offset = 0 } = req.query;
  
  if (!walletAddress) {
    return res.status(400).json({
      error: 'Endereço da carteira é obrigatório',
      code: 'MISSING_WALLET_ADDRESS'
    });
  }

  const usage = mockDatabase.usage.get(walletAddress) || [];
  const limitNum = parseInt(limit);
  const offsetNum = parseInt(offset);
  
  const paginatedUsage = usage.slice(offsetNum, offsetNum + limitNum);

  res.json({
    usage: paginatedUsage,
    pagination: {
      limit: limitNum,
      offset: offsetNum,
      total: usage.length,
      hasMore: usage.length > offsetNum + limitNum
    },
    stats: {
      totalRequests: usage.length,
      totalCost: usage.reduce((sum, item) => sum + item.cost, 0),
      avgExecutionTime: usage.length > 0 ? usage.reduce((sum, item) => sum + item.executionTime, 0) / usage.length : 0
    }
  });
});

// === STELLAR ===
app.get('/api/stellar/balances/:accountId', (req, res) => {
  const { accountId } = req.params;
  
  res.json({
    accountId,
    balances: [
      { asset: 'XLM', balance: 5.0, limit: null }
    ],
    network: 'testnet',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/stellar/demo-payment', (req, res) => {
  res.json({
    success: true,
    transaction: {
      txHash: `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      amount: '0.0000001 XLM',
      fee: '0.0001 XLM',
      ledger: 'simulado',
      timestamp: new Date().toISOString(),
      note: 'Transação simulada para demonstração'
    },
    network: 'testnet',
    warning: 'Esta é uma transação de demonstração'
  });
});

app.post('/api/stellar/validate-address', (req, res) => {
  const { address } = req.body;
  
  res.json({
    address,
    valid: isValidStellarAddress(address),
    format: 'Ed25519 Public Key',
    network: 'Stellar'
  });
});

// Middleware de erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err);
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
  console.log(`🤖 Modo: Mock (sem dependências externas)`);
  console.log(`⭐ Pronto para usar!`);
});

export default app;
