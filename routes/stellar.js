import express from 'express';
import stellarService from '../services/stellarService.js';

const router = express.Router();

/**
 * GET /api/stellar/balances/:accountId
 * Consulta saldos on-chain de uma conta Stellar
 */
router.get('/balances/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    if (!stellarService.isValidStellarAddress(accountId)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const balances = await stellarService.getAccountBalances(accountId);

    res.json({
      accountId,
      balances,
      network: process.env.STELLAR_NETWORK || 'testnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao buscar saldos Stellar:', error);
    
    if (error.message.includes('não encontrada')) {
      return res.status(404).json({
        error: error.message,
        code: 'ACCOUNT_NOT_FOUND',
        suggestion: 'Verifique se a conta foi ativada com pelo menos 1 XLM'
      });
    }

    res.status(500).json({
      error: error.message || 'Erro ao consultar saldos Stellar',
      code: 'STELLAR_ERROR'
    });
  }
});

/**
 * POST /api/stellar/demo-payment
 * Cria uma transação demo para demonstração
 */
router.post('/demo-payment', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Transações demo não disponíveis em produção',
        code: 'DEMO_NOT_ALLOWED'
      });
    }

    const { sourceAddress } = req.body;

    if (!sourceAddress) {
      return res.status(400).json({
        error: 'Endereço de origem é obrigatório',
        code: 'MISSING_SOURCE_ADDRESS'
      });
    }

    if (!stellarService.isValidStellarAddress(sourceAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const transactionResult = await stellarService.createDemoTransaction(sourceAddress);

    res.json({
      success: true,
      transaction: transactionResult,
      network: process.env.STELLAR_NETWORK || 'testnet',
      warning: 'Esta é uma transação de demonstração para fins educacionais'
    });

  } catch (error) {
    console.error('Erro na transação demo:', error);
    res.status(500).json({
      error: error.message || 'Erro ao criar transação demo',
      code: 'DEMO_TRANSACTION_ERROR'
    });
  }
});

/**
 * GET /api/stellar/account/:accountId/info
 * Verifica se uma conta existe e retorna informações básicas
 */
router.get('/account/:accountId/info', async (req, res) => {
  try {
    const { accountId } = req.params;

    if (!stellarService.isValidStellarAddress(accountId)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const accountInfo = await stellarService.checkAccountExists(accountId);

    res.json({
      accountId,
      ...accountInfo,
      network: process.env.STELLAR_NETWORK || 'testnet',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro ao verificar conta:', error);
    res.status(500).json({
      error: 'Erro ao verificar conta Stellar',
      code: 'STELLAR_ERROR'
    });
  }
});

/**
 * GET /api/stellar/network-info
 * Retorna informações da rede Stellar
 */
router.get('/network-info', async (req, res) => {
  try {
    const networkInfo = await stellarService.getNetworkInfo();

    res.json({
      ...networkInfo,
      endpoints: {
        horizon: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
        friendbot: process.env.STELLAR_NETWORK === 'testnet' 
          ? 'https://friendbot.stellar.org' 
          : null
      }
    });

  } catch (error) {
    console.error('Erro ao buscar info da rede:', error);
    res.status(500).json({
      error: 'Erro ao consultar informações da rede',
      code: 'NETWORK_ERROR'
    });
  }
});

/**
 * POST /api/stellar/validate-address
 * Valida formato de endereço Stellar
 */
router.post('/validate-address', (req, res) => {
  try {
    const { address } = req.body;

    if (!address) {
      return res.status(400).json({
        error: 'Endereço é obrigatório',
        code: 'MISSING_ADDRESS'
      });
    }

    const isValid = stellarService.isValidStellarAddress(address);

    res.json({
      address,
      valid: isValid,
      format: isValid ? 'Ed25519 Public Key' : 'Inválido',
      network: 'Stellar',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/stellar/sign-transaction
 * Assina e envia uma transação Stellar
 */
router.post('/sign-transaction', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Assinatura de transações não disponível em produção',
        code: 'SIGNING_NOT_ALLOWED'
      });
    }

    const { transactionXDR, secretKey } = req.body;

    if (!transactionXDR || !secretKey) {
      return res.status(400).json({
        error: 'Transação XDR e chave secreta são obrigatórios',
        code: 'MISSING_PARAMETERS'
      });
    }

    const result = await stellarService.signAndSubmitTransaction(transactionXDR, secretKey);

    res.json({
      success: true,
      transaction: result,
      network: process.env.STELLAR_NETWORK || 'testnet',
      warning: 'Transação enviada para a rede Stellar testnet'
    });

  } catch (error) {
    console.error('Erro ao assinar transação:', error);
    res.status(500).json({
      error: error.message || 'Erro ao assinar transação',
      code: 'SIGNING_ERROR'
    });
  }
});

/**
 * GET /api/stellar/test-address
 * Gera endereço de teste (apenas desenvolvimento)
 */
router.get('/test-address', (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        error: 'Geração de endereços de teste não disponível em produção',
        code: 'TEST_NOT_ALLOWED'
      });
    }

    const testAddress = stellarService.generateTestAddress();

    res.json({
      ...testAddress,
      instructions: {
        step1: 'Use o endereço público para fazer login',
        step2: 'Ative a conta com Friendbot: https://friendbot.stellar.org',
        step3: 'Adicione fundos de teste se necessário'
      }
    });

  } catch (error) {
    console.error('Erro ao gerar endereço de teste:', error);
    res.status(500).json({
      error: error.message || 'Erro ao gerar endereço de teste',
      code: 'TEST_ADDRESS_ERROR'
    });
  }
});

export default router;
