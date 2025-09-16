import express from 'express';
import { queries } from '../db/database.js';
import stellarService from '../services/stellarService.js';
import pricingService from '../services/pricingService.js';

const router = express.Router();

/**
 * GET /api/usage
 * Busca histórico de uso do usuário
 */
router.get('/', async (req, res) => {
  try {
    const { walletAddress, limit = 20, offset = 0, period } = req.query;

    // Validar entrada
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

    const limitNum = parseInt(limit);
    const offsetNum = parseInt(offset);

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Limit deve ser entre 1 e 100',
        code: 'INVALID_LIMIT'
      });
    }

    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        error: 'Offset deve ser maior ou igual a 0',
        code: 'INVALID_OFFSET'
      });
    }

    // Buscar dados
    const usage = queries.getUserUsage.all(walletAddress, limitNum, offsetNum);

    // Filtrar por período se especificado
    let filteredUsage = usage;
    if (period) {
      const now = new Date();
      let cutoffDate;
      
      switch (period) {
        case 'all':
          // Não filtrar por data
          filteredUsage = usage;
          break;
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return res.status(400).json({
            error: 'Período inválido. Use: all, today, 7d, 30d',
            code: 'INVALID_PERIOD'
          });
      }

      if (period !== 'all') {
        filteredUsage = usage.filter(item => 
          new Date(item.created_at) >= cutoffDate
        );
      }
    }

    // Formatar resposta
    const formattedUsage = filteredUsage.map(item => ({
      id: item.id,
      prompt_hash: item.prompt_hash,
      prompt_preview: item.prompt_preview,
      response_preview: item.response_preview,
      tokens_est: item.tokens_est,
      cost_amount: item.cost_amount,
      cost_asset: item.cost_asset,
      status: item.status,
      execution_time: item.execution_time,
      tx_hash: item.tx_hash,
      created_at: item.created_at,
      // Campos adicionais para compatibilidade
      promptHash: item.prompt_hash,
      promptPreview: item.prompt_preview,
      responsePreview: item.response_preview,
      tokens: item.tokens_est,
      cost: item.cost_amount,
      costFormatted: pricingService.formatAmount(item.cost_amount),
      asset: item.cost_asset,
      executionTime: item.execution_time,
      txHash: item.tx_hash,
      createdAt: item.created_at,
      createdAtFormatted: new Date(item.created_at).toLocaleString('pt-BR')
    }));

    // Estatísticas do período
    const stats = {
      totalRequests: filteredUsage.length,
      totalCost: filteredUsage.reduce((sum, item) => sum + item.cost_amount, 0),
      avgExecutionTime: filteredUsage.length > 0 
        ? filteredUsage.reduce((sum, item) => sum + (item.execution_time || 0), 0) / filteredUsage.length
        : 0
    };

    res.json({
      usage: formattedUsage,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: usage.length,
        hasMore: usage.length === limitNum
      },
      stats: {
        ...stats,
        totalCostFormatted: pricingService.formatAmount(stats.totalCost),
        avgExecutionTimeFormatted: `${Math.round(stats.avgExecutionTime)}ms`
      },
      period: period || 'all'
    });

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/usage/stats
 * Busca estatísticas detalhadas de uso
 */
router.get('/stats', async (req, res) => {
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

    // Buscar estatísticas dos últimos 30 dias
    const stats = queries.getUsageStats.get(walletAddress);

    // Buscar dados para gráfico dos últimos 7 dias
    const weeklyUsage = queries.getUserUsage.all(walletAddress, 1000, 0)
      .filter(item => {
        const itemDate = new Date(item.created_at);
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return itemDate >= weekAgo;
      });

    // Agrupar por dia
    const dailyStats = {};
    weeklyUsage.forEach(item => {
      const day = new Date(item.created_at).toISOString().split('T')[0];
      if (!dailyStats[day]) {
        dailyStats[day] = {
          date: day,
          requests: 0,
          cost: 0,
          avgExecutionTime: 0
        };
      }
      dailyStats[day].requests++;
      dailyStats[day].cost += item.cost_amount;
      dailyStats[day].avgExecutionTime += item.execution_time || 0;
    });

    // Calcular médias
    Object.values(dailyStats).forEach(day => {
      day.avgExecutionTime = day.requests > 0 ? day.avgExecutionTime / day.requests : 0;
    });

    res.json({
      overall: {
        totalRequests: stats?.total_requests || 0,
        totalCost: stats?.total_cost || 0,
        totalCostFormatted: pricingService.formatAmount(stats?.total_cost || 0),
        avgExecutionTime: stats?.avg_execution_time || 0,
        avgExecutionTimeFormatted: `${Math.round(stats?.avg_execution_time || 0)}ms`,
        period: '30 dias'
      },
      daily: Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date)),
      summary: {
        mostActiveDay: Object.values(dailyStats).reduce((max, day) => 
          day.requests > (max?.requests || 0) ? day : max, null
        ),
        totalWeeklyRequests: weeklyUsage.length,
        totalWeeklyCost: weeklyUsage.reduce((sum, item) => sum + item.cost_amount, 0)
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/usage/export
 * Exporta histórico em formato CSV
 */
router.get('/export', async (req, res) => {
  try {
    const { walletAddress, period } = req.query;

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

    // Buscar todos os dados (sem paginação para export)
    const usage = queries.getUserUsage.all(walletAddress, 10000, 0);

    // Filtrar por período se especificado
    let filteredUsage = usage;
    if (period && period !== 'all') {
      const now = new Date();
      let cutoffDate;
      
      switch (period) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case '7d':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          return res.status(400).json({
            error: 'Período inválido. Use: today, 7d, 30d, all',
            code: 'INVALID_PERIOD'
          });
      }

      if (period !== 'all') {
        filteredUsage = usage.filter(item => 
          new Date(item.created_at) >= cutoffDate
        );
      }
    }

    // Gerar CSV
    const csvHeaders = [
      'Data',
      'Hash do Prompt',
      'Preview do Prompt',
      'Tokens',
      'Custo (XLM)',
      'Status',
      'Tempo de Execução (ms)',
      'TX Hash'
    ].join(',');

    const csvRows = filteredUsage.map(item => [
      new Date(item.created_at).toLocaleString('pt-BR'),
      item.prompt_hash,
      `"${item.prompt_preview.replace(/"/g, '""')}"`, // Escapar aspas
      item.tokens_est,
      item.cost_amount,
      item.status,
      item.execution_time || 0,
      item.tx_hash || ''
    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');

    // Configurar headers de resposta
    const filename = `ai-gateway-usage-${walletAddress.slice(0, 8)}-${new Date().toISOString().split('T')[0]}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    res.send('\ufeff' + csv); // BOM para UTF-8

  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
