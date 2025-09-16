# 🚀 Deploy na Vercel - Guia Completo

## 🚨 Por que estava dando erro 500?

### Problemas identificados:
1. **SQLite (better-sqlite3)**: Vercel é serverless, não suporta dependências nativas
2. **File System**: Não permite escrita no disco
3. **CORS**: Configurado apenas para localhost
4. **Express App**: Não adaptada para serverless functions

## ✅ Solução Implementada

### Arquivos Criados:
- `vercel.json` - Configuração da Vercel
- `api/index.js` - Handler serverless
- `services/mockService.js` - Banco de dados em memória
- `package-vercel.json` - Dependências otimizadas
- `setup-vercel.sh` - Script de configuração

## 🛠️ Como Fazer o Deploy

### 1. Preparar o Projeto
```bash
# Executar script de setup
chmod +x setup-vercel.sh
./setup-vercel.sh
```

### 2. Commit e Push
```bash
git add .
git commit -m "feat: configurar deploy para Vercel"
git push origin main
```

### 3. Configurar na Vercel

#### 3.1 Conectar Repositório
1. Acesse [vercel.com](https://vercel.com)
2. Clique em "New Project"
3. Conecte seu repositório GitHub
4. Selecione a pasta `hack-meridian-back-end`

#### 3.2 Configurar Build Settings
- **Framework Preset**: Other
- **Root Directory**: `hack-meridian-back-end`
- **Build Command**: `echo "No build required"`
- **Output Directory**: deixe em branco
- **Install Command**: `npm install`

#### 3.3 Variáveis de Ambiente
Adicione estas variáveis na Vercel:

```env
NODE_ENV=production
AI_PROVIDER=mock
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
PRICE_SHORT_XLM=0.02
PRICE_LONG_XLM=0.05
SHORT_LIMIT_TOKENS=300
```

### 4. Deploy
1. Clique em "Deploy"
2. Aguarde o build
3. Teste o endpoint: `https://seu-projeto.vercel.app/api/health`

## 🧪 Testar o Deploy

### Endpoints Disponíveis:
```bash
# Health check
GET https://seu-projeto.vercel.app/api/health

# Auth
POST https://seu-projeto.vercel.app/api/auth/wallet

# Credits
GET https://seu-projeto.vercel.app/api/credits/balance?walletAddress=GABR...

# AI
POST https://seu-projeto.vercel.app/api/ai/completions

# Usage
GET https://seu-projeto.vercel.app/api/usage?walletAddress=GABR...

# Stellar
GET https://seu-projeto.vercel.app/api/stellar/balances/GABR...
```

### Teste rápido com curl:
```bash
# Substituir pela sua URL da Vercel
VERCEL_URL="https://seu-projeto.vercel.app"

# Health check
curl "$VERCEL_URL/api/health"

# Login
curl -X POST "$VERCEL_URL/api/auth/wallet" \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "GABR7JXQX7IXBQX7IXBQX7IXBQX7IXBQX7IXBQX7IXBQX7IXBQX7IXBQP53E"}'
```

## 🔧 Configurar Frontend

Após o deploy do backend, configure o frontend:

### 1. Atualizar URL da API
No `hack-meridian-front-end/src/services/api.js`:

```javascript
const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'https://seu-projeto-backend.vercel.app/api'
  : 'http://localhost:3001/api';
```

### 2. Deploy do Frontend
```bash
cd ../hack-meridian-front-end

# Configurar variável de ambiente
echo "VITE_API_BASE_URL=https://seu-projeto-backend.vercel.app/api" > .env.production

# Deploy na Vercel
vercel --prod
```

## 🎯 Funcionalidades Disponíveis

### ✅ Funcionando:
- Autenticação com carteira Stellar
- Consulta de saldos Stellar (via Horizon API)
- Sistema de créditos em memória
- Respostas de IA mockadas
- Histórico de uso
- Conversas e mensagens
- CORS configurado para Vercel

### ⚠️ Limitações (modo mock):
- Dados não persistem entre deployments
- IA usa respostas pré-definidas
- Créditos são simulados
- Banco de dados em memória

## 🔄 Atualizar Deploy

Para atualizar:
```bash
git add .
git commit -m "feat: atualizar API"
git push origin main
# Vercel faz deploy automático
```

## 🐛 Troubleshooting

### Erro 500 ainda persiste:
1. Verifique os logs na Vercel Dashboard
2. Confirme que as variáveis de ambiente estão configuradas
3. Teste o endpoint `/api/health` primeiro

### CORS Error no Frontend:
1. Adicione o domínio do frontend no `api/index.js`
2. Verifique se as headers estão corretas

### Timeout Error:
1. Aumente `maxDuration` no `vercel.json`
2. Otimize as consultas à API Stellar

## 📊 Monitoramento

### Logs:
- Acesse Vercel Dashboard > Functions > Logs
- Use `console.log()` para debug

### Performance:
- Vercel Analytics automático
- Monitor execution time nos logs

### Rate Limits:
- Vercel: 100 execuções/segundo (hobby)
- Stellar Horizon: sem rate limit oficial

## 🚀 Próximos Passos

1. **Banco Real**: Migrar para PostgreSQL (Vercel Postgres)
2. **IA Real**: Integrar OpenAI ou Anthropic
3. **Cache**: Implementar Redis para performance
4. **Monitoring**: Adicionar Sentry para erros
5. **CI/CD**: Automatizar testes antes do deploy

## 💡 Dicas Importantes

- **Cold Start**: Primeiras requisições podem ser lentas
- **Memory Limit**: 1024MB por função (hobby plan)
- **Execution Time**: 10s por função (hobby plan)
- **Concurrent**: 1000 execuções simultâneas (hobby plan)

Agora seu backend deve funcionar perfeitamente na Vercel! 🎉
