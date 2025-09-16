# 🛠️ Guia de Instalação - Backend

## Problema com better-sqlite3 no Windows

Se você está enfrentando erros de compilação com `better-sqlite3`, aqui estão as soluções:

## 🚀 Solução 1: Instalar Build Tools (Recomendado)

### Instalar Visual Studio Build Tools
```bash
# Baixar e instalar Visual Studio Build Tools 2022
# https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022

# OU instalar via chocolatey
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"

# OU instalar via winget
winget install Microsoft.VisualStudio.2022.BuildTools
```

### Depois instalar normalmente
```bash
npm install
```

## 🔧 Solução 2: Usar sqlite3 (Alternativa)

Se ainda der problema, use a versão alternativa:

```bash
# Deletar node_modules e package-lock.json
rm -rf node_modules package-lock.json

# Usar package alternativo
cp package-simple.json package.json

# Instalar
npm install
```

## ⚡ Solução 3: Modo Mock (Sem Banco)

Se nada funcionar, o sistema tem fallback automático para modo mock:

```bash
# Apenas instalar as dependências básicas
npm install express cors helmet express-rate-limit @stellar/stellar-sdk dotenv axios

# Rodar sem banco (modo mock)
npm start
```

## 🔍 Verificar Instalação

```bash
# Testar se funcionou
npm run init-db

# Se der erro, usar modo mock
node server.js
```

## 📝 Notas

- **better-sqlite3**: Mais rápido, mas precisa compilar
- **sqlite3**: Mais compatível, um pouco mais lento
- **Mock mode**: Sempre funciona, dados simulados

## 🆘 Se Nada Funcionar

O frontend funciona independentemente com modo mock automático:

```bash
cd ../hack-meridian-front-end
npm install
npm run dev
```

O sistema detecta automaticamente se o backend está disponível e ativa o modo mock.
