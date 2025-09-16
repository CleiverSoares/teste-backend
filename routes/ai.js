import express from 'express';
import crypto from 'crypto';
import aiService from '../services/aiService.js';
import creditsService from '../services/creditsService.js';
import stellarService from '../services/stellarService.js';
import pricingService from '../services/pricingService.js';
import { queries } from '../db/database.js';

const router = express.Router();

/**
 * POST /api/ai/completions
 * Processa prompt e retorna resposta da IA
 */
router.post('/completions', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 === INÍCIO DA REQUISIÇÃO DE IA ===');
    console.log('📦 Body completo:', JSON.stringify(req.body, null, 2));
    
    const { walletAddress, prompt, secretKey } = req.body;

    console.log('🔍 Dados extraídos:');
    console.log('  walletAddress:', walletAddress);
    console.log('  prompt length:', prompt?.length || 0);
    console.log('  secretKey existe?', !!secretKey);
    console.log('  secretKey type:', typeof secretKey);
    console.log('  secretKey length:', secretKey?.length || 0);
    console.log('  secretKey preview:', secretKey ? secretKey.substring(0, 10) + '...' : 'N/A');

    // Validar entrada
    if (!walletAddress || !prompt) {
      return res.status(400).json({
        error: 'Endereço da carteira e prompt são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        error: 'Prompt deve ser um texto válido',
        code: 'INVALID_PROMPT'
      });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({
        error: 'Prompt muito longo (máximo 10.000 caracteres)',
        code: 'PROMPT_TOO_LONG'
      });
    }

    // Processar pagamento (usar saldo real se chave secreta fornecida)
    let paymentResult;
    
    console.log('💰 === VERIFICAÇÃO DE TIPO DE PAGAMENTO ===');
    console.log('🔑 Chave secreta fornecida?', !!(secretKey && secretKey.trim().length > 0));
    
    if (secretKey && secretKey.trim().length > 0) {
      console.log('💰 === MODO SALDO REAL ===');
      console.log('🔑 Chave secreta detectada - não debitando do simulado');
      
      // Estimar custo sem debitar do simulado
      const cost = pricingService.calculateCost(prompt);
      console.log('💰 Custo estimado:', cost);
      
      // Criar resultado "fake" para não debitar do simulado
      paymentResult = {
        walletAddress: walletAddress,
        balance: 999999, // Valor alto para não bloquear
        debited: cost.cost,
        asset: 'XLM',
        cost: cost,
        balanceAfter: 999999 - cost.cost
      };
      console.log('💰 Usando saldo real - não debitando do simulado');
      
    } else {
      console.log('💰 === MODO SALDO SIMULADO ===');
      try {
        paymentResult = await creditsService.processAIPayment(walletAddress, prompt);
        console.log('💰 Créditos simulados debitados:', paymentResult);
      } catch (error) {
        if (error.code === 'INSUFFICIENT_BALANCE') {
          return res.status(402).json({
            error: 'Saldo insuficiente',
            code: 'INSUFFICIENT_BALANCE',
            required: error.details.required,
            current: error.details.current,
            deficit: error.details.deficit
          });
        }
        throw error;
      }
    }

    // Chamar IA
    let aiResult;
    try {
      aiResult = await aiService.callAI(prompt.trim());
    } catch (error) {
      // Se a IA falhar, devolver créditos
      try {
        await creditsService.addCredits(walletAddress, paymentResult.cost.cost);
      } catch (refundError) {
        console.error('Erro ao devolver créditos:', refundError);
      }

      return res.status(503).json({
        error: 'Serviço de IA temporariamente indisponível',
        code: 'AI_SERVICE_UNAVAILABLE',
        details: error.message
      });
    }

    // Registrar log de uso
    const promptHash = crypto.createHash('sha256').update(prompt).digest('hex').slice(0, 16);
    const promptPreview = prompt.substring(0, 90);
    const responsePreview = aiResult.response.substring(0, 200);
    const executionTime = Date.now() - startTime;
    
    // Gerar hash de transação
    let txHash;
    let transactionXDR = null;
    let stellarDebugError = null;
    
    console.log('🔍 === VERIFICAÇÃO DE CHAVE SECRETA ===');
    console.log('secretKey existe?', !!secretKey);
    console.log('secretKey é string?', typeof secretKey === 'string');
    console.log('secretKey não está vazia?', secretKey && secretKey.trim().length > 0);
    console.log('secretKey após trim:', secretKey ? secretKey.trim().substring(0, 10) + '...' : 'N/A');
    
    if (secretKey && secretKey.trim().length > 0) {
      try {
        console.log('🔑 === CRIANDO TRANSAÇÃO REAL ===');
        console.log('📍 Endereço:', walletAddress);
        console.log('🔑 Chave (primeiros 10 chars):', secretKey.trim().substring(0, 10) + '...');
        console.log('💰 Custo do prompt:', paymentResult.cost);
        
        // Primeiro, verificar saldo real da conta Stellar
        console.log('💰 === VERIFICANDO SALDO REAL ===');
        const realBalance = await stellarService.getRealBalance(secretKey);
        console.log('💰 Saldo real encontrado:', realBalance.balance, 'XLM');
        console.log('💰 Custo necessário:', paymentResult.cost.cost, 'XLM');
        
        // Verificar se tem saldo suficiente
        if (realBalance.balance < paymentResult.cost.cost) {
          throw new Error(`Saldo insuficiente na conta Stellar. Disponível: ${realBalance.balance} XLM, Necessário: ${paymentResult.cost.cost} XLM`);
        }
        
        // Criar transação real do Stellar com custo do prompt
        console.log('🔗 Criando transação real do Stellar...');
        console.log('💰 Custo do prompt:', paymentResult.cost.cost, 'XLM');
        const transactionResult = await stellarService.createDemoTransaction(walletAddress, paymentResult.cost.cost);
        console.log('📦 Transação criada:', transactionResult);
        console.log('📦 transactionXDR:', transactionResult.transactionXDR);
        console.log('📦 transactionXDR type:', typeof transactionResult.transactionXDR);
        console.log('📦 transactionXDR length:', transactionResult.transactionXDR?.length);
        transactionXDR = transactionResult.transactionXDR;
        
        // Assinar e enviar transação
        console.log('✍️ Assinando e enviando transação...');
        const signResult = await stellarService.signAndSubmitTransaction(transactionXDR, secretKey);
        console.log('📤 Resultado da assinatura:', signResult);
        
        if (signResult.success) {
          txHash = signResult.txHash;
          console.log(`✅ Transação enviada com sucesso! Hash: ${txHash}`);
        } else {
          throw new Error('Falha ao enviar transação: ' + signResult.error);
        }
      } catch (stellarError) {
        const errorMessage = stellarError.message || 'Erro desconhecido';
        const errorDetails = {
          message: errorMessage,
          stack: stellarError.stack?.substring(0, 500),
          type: stellarError.constructor.name,
          timestamp: new Date().toISOString()
        };
        
        console.error('❌ ERRO NA TRANSAÇÃO STELLAR:', errorMessage);
        console.error('❌ Detalhes completos:', stellarError);
        console.error('❌ Stack trace:', stellarError.stack);
        
        // Log específico para debug
        if (errorMessage.includes('Chave secreta')) {
          console.error('🔑 Problema com chave secreta fornecida');
        } else if (errorMessage.includes('Saldo insuficiente')) {
          console.error('💰 Saldo insuficiente na conta Stellar');
        } else if (errorMessage.includes('transação')) {
          console.error('📦 Problema na criação/envio da transação');
        }
        
        // Fallback para hash demo se falhar
        txHash = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        console.log(`⚠️ Usando hash demo devido ao erro: ${txHash}`);
        
        // ADICIONAR ERRO NA RESPOSTA PARA DEBUG
        stellarDebugError = errorDetails;
      }
    } else {
      // Modo demonstração - hash simulado
      txHash = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log(`📝 Modo demo - Hash simulado: ${txHash}`);
    }
    
    // Log para debug
    console.log(`📝 Log de uso: ${promptPreview}... | Custo: ${paymentResult.cost.cost} XLM | Hash: ${txHash}`);
    console.log('🔍 Debug paymentResult:', JSON.stringify(paymentResult, null, 2));

    try {
      const user = queries.getUserByWallet.get(walletAddress);
      if (user) {
        queries.insertUsageLog.run(
          user.id,
          promptHash,
          promptPreview,
          paymentResult.cost.tokens,
          'XLM',
          paymentResult.cost.cost,
          responsePreview,
          txHash,
          'completed',
          executionTime
        );
      }
    } catch (logError) {
      console.error('Erro ao registrar log:', logError);
      // Não falhar a requisição por erro de log
    }

    // Resposta de sucesso
    res.json({
      response: aiResult.response,
      cost: paymentResult.cost.cost,
      tokens: paymentResult.cost.tokens,
      tier: paymentResult.cost.tier,
      balanceAfter: paymentResult.balanceAfter,
      executionTime: aiResult.executionTime,
      promptHash,
      txHash: txHash || null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na completions:', error);
    
    const executionTime = Date.now() - startTime;
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      executionTime
    });
  }
});

/**
 * GET /api/ai/status
 * Verifica status dos serviços de IA
 */
router.get('/status', async (req, res) => {
  try {
    const availability = await aiService.checkAvailability();
    
    res.json({
      ...availability,
      timestamp: new Date().toISOString(),
      providers: {
        ollama: {
          url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          model: process.env.OLLAMA_MODEL || 'llama3.2:3b-instruct'
        },
        openai: {
          configured: !!(process.env.OPENAI_API_BASE && process.env.OPENAI_API_KEY),
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo'
        }
      }
    });

  } catch (error) {
    console.error('Erro ao verificar status da IA:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/ai/test
 * Testa conectividade com os serviços de IA
 */
router.post('/test', async (req, res) => {
  try {
    const testPrompt = 'Responda apenas: "Teste de conectividade OK"';
    
    const result = await aiService.callAI(testPrompt);
    
    res.json({
      success: true,
      response: result.response,
      executionTime: result.executionTime,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no teste de IA:', error);
    res.status(503).json({
      success: false,
      error: 'Falha no teste de conectividade',
      code: 'AI_TEST_FAILED',
      details: error.message
    });
  }
});

export default router;
