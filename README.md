# AI Gateway - Backend

Gateway de IA por Créditos usando Ollama local, Stellar testnet e créditos off-chain.

## 🚀 Características

- **IA Local**: Ollama como provider principal com fallback para OpenAI-compatível
- **Créditos Off-chain**: Sistema de pagamento simulado para demonstração
- **Stellar Integration**: Consultas testnet e transações demo educacionais
- **SQLite Database**: Banco local com better-sqlite3
- **Rate Limiting**: Proteção contra abuso
- **Modo Mock**: Fallback automático quando APIs não estão disponíveis

## 📋 Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Ollama (opcional - para IA local)
- Stellar testnet account (opcional - para demo)

## 🛠️ Instalação

```bash
# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env

# Inicializar banco de dados
npm run init-db

# Iniciar servidor
npm run dev
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env)

```env
# Servidor
PORT=3001
NODE_ENV=development

# Banco de dados
DB_PATH=./data/ai-gateway.db

# IA - Ollama (Padrão)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b-instruct

# IA - Fallback OpenAI-compatível (Opcional)
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-3.5-turbo

# Stellar
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

# Preços (XLM)
PRICE_SHORT_XLM=0.02
PRICE_LONG_XLM=0.05
SHORT_LIMIT_TOKENS=300

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30
RATE_LIMIT_MAX_REQUESTS_PER_WALLET=10
```

## 🤖 Configuração da IA

### Opção 1: Ollama Local (Recomendado)

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixar modelo
ollama pull llama3.2:3b-instruct

# Verificar se está rodando
curl http://localhost:11434/api/tags
```

**Modelos sugeridos para 16GB RAM:**
- `llama3.2:3b-instruct` - Rápido e eficiente
- `qwen2.5:3b-instruct` - Boa qualidade
- `phi3:3.8b` - Microsoft Phi-3 Mini

### Opção 2: OpenAI-compatível

Configure as variáveis:
```env
OPENAI_API_BASE=https://api.openai.com/v1
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo
```

### Opção 3: Modo Mock (Automático)

Se nenhum provider estiver disponível, o sistema usa respostas simuladas automaticamente.

## 📊 API Endpoints

### Autenticação
- `POST /api/auth/wallet` - Login com endereço Stellar
- `GET /api/auth/profile/:walletAddress` - Buscar perfil
- `PUT /api/auth/profile/:walletAddress` - Atualizar perfil

### Créditos
- `GET /api/credits/balance?walletAddress=...` - Consultar saldo
- `POST /api/credits/topup` - Adicionar créditos (demo)
- `POST /api/credits/estimate-cost` - Estimar custo do prompt
- `GET /api/credits/pricing` - Informações de preços

### IA
- `POST /api/ai/completions` - Processar prompt
- `GET /api/ai/status` - Status dos providers
- `POST /api/ai/test` - Testar conectividade

### Histórico
- `GET /api/usage?walletAddress=...` - Histórico de uso
- `GET /api/usage/stats?walletAddress=...` - Estatísticas
- `GET /api/usage/export?walletAddress=...` - Exportar CSV

### Stellar
- `GET /api/stellar/balances/:accountId` - Consultar saldos
- `POST /api/stellar/demo-payment` - Transação demo
- `GET /api/stellar/account/:accountId/info` - Info da conta
- `POST /api/stellar/validate-address` - Validar endereço

## 🗄️ Estrutura do Banco

### Tabelas

```sql
-- Usuários
users (
  id INTEGER PRIMARY KEY,
  wallet_address TEXT UNIQUE,
  name TEXT,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TEXT,
  updated_at TEXT
)

-- Créditos off-chain
credits (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  asset TEXT DEFAULT 'XLM',
  balance REAL DEFAULT 0,
  updated_at TEXT,
  UNIQUE(user_id, asset)
)

-- Logs de uso
usage_logs (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  prompt_hash TEXT,
  prompt_preview TEXT,
  tokens_est INTEGER,
  cost_asset TEXT DEFAULT 'XLM',
  cost_amount REAL,
  response_preview TEXT,
  tx_hash TEXT,
  status TEXT DEFAULT 'completed',
  execution_time INTEGER,
  created_at TEXT
)
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Servidor com hot-reload
npm start           # Servidor produção

# Banco de dados
npm run init-db     # Inicializar/resetar banco

# Utilitários
npm test           # Testes (não implementado)
```

## 🏗️ Arquitetura

```
backend/
├── server.js              # Servidor Express principal
├── db/
│   └── database.js        # Conexão SQLite + queries preparadas
├── routes/
│   ├── auth.js           # Autenticação
│   ├── credits.js        # Gerenciamento de créditos
│   ├── ai.js            # Endpoints de IA
│   ├── usage.js         # Histórico e estatísticas
│   └── stellar.js       # Integração Stellar
├── services/
│   ├── aiService.js     # Lógica de IA (Ollama/OpenAI/Mock)
│   ├── creditsService.js # Lógica de créditos
│   ├── pricingService.js # Cálculo de preços
│   └── stellarService.js # Integração Stellar SDK
├── scripts/
│   └── init-db.js       # Inicialização do banco
└── middleware/          # Middlewares customizados (futuro)
```

## 🔒 Segurança

- **Rate Limiting**: 30 req/min por IP, 10 req/min por carteira
- **Validação**: Todos os inputs são validados
- **CORS**: Configurado para desenvolvimento/produção
- **Helmet**: Headers de segurança
- **LGPD**: Dados mínimos necessários

## 🚨 Limitações do MVP

- **Não custodial**: Não armazena chaves privadas
- **Off-chain**: Créditos são simulados (não blockchain real)
- **Testnet only**: Apenas para demonstração/educação
- **Demo transactions**: Transações Stellar são simuladas
- **Local database**: SQLite não é adequado para produção distribuída

## 🧪 Testando

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Login
```bash
curl -X POST http://localhost:3001/api/auth/wallet \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"GCEXAMPLE123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890"}'
```

### IA Completion
```bash
curl -X POST http://localhost:3001/api/ai/completions \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress":"GCEXAMPLE123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
    "prompt":"Olá, como você está?"
  }'
```

## 🐛 Troubleshooting

### Ollama não conecta
```bash
# Verificar se Ollama está rodando
curl http://localhost:11434/api/tags

# Reiniciar Ollama
ollama serve
```

### Banco não inicializa
```bash
# Deletar e recriar
rm -rf data/
npm run init-db
```

### Rate limit atingido
```bash
# Aguardar 1 minuto ou reiniciar servidor
```

## 📝 Logs

O servidor gera logs detalhados:
- Requisições HTTP
- Erros de API
- Status dos providers de IA
- Operações do banco de dados

## 🔄 Fallback Automático

O sistema tem fallback automático:
1. **Ollama** (preferido)
2. **OpenAI-compatível** (se configurado)
3. **Mock** (sempre disponível)

## 🌍 Produção

Para produção, considere:
- PostgreSQL ao invés de SQLite
- Redis para cache e rate limiting
- Load balancer
- Monitoramento (Prometheus/Grafana)
- Logs estruturados (Winston)
- Testes automatizados

## 📞 Suporte

Para dúvidas sobre configuração ou problemas:
1. Verifique os logs do servidor
2. Teste endpoints individualmente
3. Confirme variáveis de ambiente
4. Verifique conectividade com Ollama/OpenAI

---

**Nota**: Este é um MVP para demonstração. Para uso em produção, implemente autenticação robusta, auditoria completa e infraestrutura escalável.
