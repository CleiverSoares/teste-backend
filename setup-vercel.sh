#!/bin/bash

echo "🚀 Configurando projeto para deploy na Vercel..."

# Backup do package.json original
if [ ! -f "package.json.backup" ]; then
  echo "📦 Fazendo backup do package.json original..."
  cp package.json package.json.backup
fi

# Usar package.json otimizado para Vercel
echo "📦 Usando package.json otimizado para Vercel..."
cp package-vercel.json package.json

# Criar diretório api se não existir
mkdir -p api

echo "✅ Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Commit e push das alterações"
echo "2. Conectar repositório na Vercel"
echo "3. Configurar variáveis de ambiente na Vercel:"
echo "   - NODE_ENV=production"
echo "   - AI_PROVIDER=mock"
echo "   - STELLAR_NETWORK=testnet"
echo "   - STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org"
echo ""
echo "🌐 Endpoints que estarão disponíveis:"
echo "   - https://seu-projeto.vercel.app/api/health"
echo "   - https://seu-projeto.vercel.app/api/auth/*"
echo "   - https://seu-projeto.vercel.app/api/credits/*"
echo "   - https://seu-projeto.vercel.app/api/ai/*"
