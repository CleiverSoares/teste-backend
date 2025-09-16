import express from 'express';
import creditsService from '../services/creditsService.js';
import stellarService from '../services/stellarService.js';
import pricingService from '../services/pricingService.js';

const router = express.Router();

/**
 * POST /api/credits/real-balance
 * Obtém saldo real da conta Stellar usando chave secreta
 */
router.post('/real-balance', async (req, res) => {
  try {
    const { secretKey } = req.body;

    if (!secretKey) {
      return res.status(400).json({
        error: 'Chave secreta é obrigatória',
        code: 'MISSING_SECRET_KEY'
      });
    }

    const realBalance = await stellarService.getRealBalance(secretKey);
    
    res.json({
      ...realBalance,
      formatted: pricingService.formatAmount(realBalance.balance),
      source: 'stellar-network',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao buscar saldo real:', error);
    res.status(500).json({
      error: error.message || 'Erro ao consultar saldo na rede Stellar',
      code: 'STELLAR_BALANCE_ERROR'
    });
  }
});

/**
 * GET /api/credits/balance
 * Obtém saldo off-chain do usuário
 */
router.get('/balance', async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Endereço da carteira é obrigatório',
        code: 'MISSING_WALLET_ADDRESS'
      });
    }

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const balance = await creditsService.getBalance(walletAddress);
    const stats = await creditsService.getUsageStats(walletAddress);

    res.json({
      ...balance,
      stats,
      formatted: pricingService.formatAmount(balance.balance)
    });

  } catch (error) {
    console.error('Erro ao buscar saldo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/credits/topup
 * Adiciona créditos à conta (simulação)
 */
router.post('/topup', async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;

    // Validar entrada
    if (!walletAddress || !amount) {
      return res.status(400).json({
        error: 'Endereço da carteira e valor são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        error: 'Valor deve ser um número positivo',
        code: 'INVALID_AMOUNT'
      });
    }

    if (numericAmount > 10) {
      return res.status(400).json({
        error: 'Valor máximo para demonstração: 10 XLM',
        code: 'AMOUNT_TOO_HIGH'
      });
    }

    const result = await creditsService.addCredits(walletAddress, numericAmount);

    res.json({
      ...result,
      formatted: {
        balance: pricingService.formatAmount(result.balance),
        added: pricingService.formatAmount(result.added)
      },
      message: `${pricingService.formatAmount(numericAmount)} adicionados com sucesso`,
      note: 'Esta é uma simulação off-chain para demonstração'
    });

  } catch (error) {
    console.error('Erro ao adicionar créditos:', error);
    
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({
        error: error.message,
        code: 'USER_NOT_FOUND'
      });
    }

    res.status(500).json({
      error: error.message || 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/credits/check-balance
 * Verifica se há saldo suficiente para uma operação
 */
router.post('/check-balance', async (req, res) => {
  try {
    const { walletAddress, amount } = req.body;

    if (!walletAddress || amount === undefined) {
      return res.status(400).json({
        error: 'Endereço da carteira e valor são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        error: 'Valor deve ser um número válido',
        code: 'INVALID_AMOUNT'
      });
    }

    const result = await creditsService.checkSufficientBalance(walletAddress, numericAmount);

    res.json({
      ...result,
      formatted: {
        current: pricingService.formatAmount(result.current),
        required: pricingService.formatAmount(result.required),
        deficit: result.deficit ? pricingService.formatAmount(result.deficit) : null
      }
    });

  } catch (error) {
    console.error('Erro ao verificar saldo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/credits/pricing
 * Retorna informações de preços
 */
router.get('/pricing', (req, res) => {
  try {
    const pricing = pricingService.getPricingInfo();
    
    res.json({
      ...pricing,
      formatted: {
        short: pricingService.formatAmount(pricing.short.price),
        long: pricingService.formatAmount(pricing.long.price)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar preços:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/credits/estimate-cost
 * Estima o custo de um prompt
 */
router.post('/estimate-cost', (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        error: 'Prompt é obrigatório',
        code: 'MISSING_PROMPT'
      });
    }

    if (prompt.length > 10000) {
      return res.status(400).json({
        error: 'Prompt muito longo (máximo 10.000 caracteres)',
        code: 'PROMPT_TOO_LONG'
      });
    }

    const estimate = pricingService.calculateCost(prompt);

    res.json({
      ...estimate,
      formatted: {
        cost: pricingService.formatAmount(estimate.cost)
      },
      promptLength: prompt.length
    });

  } catch (error) {
    console.error('Erro ao estimar custo:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
