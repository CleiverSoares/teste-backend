import express from 'express';
import { queries } from '../db/database.js';
import stellarService from '../services/stellarService.js';

const router = express.Router();

/**
 * POST /api/transactions/associate
 * Associa uma transação Stellar real a um log de uso
 */
router.post('/associate', async (req, res) => {
  try {
    const { walletAddress, txHash, usageLogId } = req.body;

    if (!walletAddress || !txHash || !usageLogId) {
      return res.status(400).json({
        error: 'Endereço da carteira, hash da transação e ID do log são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Validar endereço Stellar
    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    // Buscar usuário
    const user = queries.getUserByWallet.get(walletAddress);
    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Atualizar log de uso com hash real
    const result = queries.updateUsageLogTxHash.run(txHash, usageLogId, user.id);

    if (result.changes === 0) {
      return res.status(404).json({
        error: 'Log de uso não encontrado',
        code: 'USAGE_LOG_NOT_FOUND'
      });
    }

    res.json({
      success: true,
      message: 'Transação associada com sucesso',
      txHash,
      usageLogId
    });

  } catch (error) {
    console.error('Erro ao associar transação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/transactions/:walletAddress
 * Lista transações Stellar de um usuário
 */
router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    // Buscar logs de uso com hash de transação
    const logs = queries.getUsageLogsWithTxHash.get(walletAddress);

    res.json({
      walletAddress,
      transactions: logs || [],
      count: logs ? logs.length : 0
    });

  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
