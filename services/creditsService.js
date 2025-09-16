import { queries } from '../db/database.js';
import pricingService from './pricingService.js';

class CreditsService {
  /**
   * Obtém o saldo do usuário
   * @param {string} walletAddress 
   * @param {string} asset 
   * @returns {Promise<{balance: number, walletAddress: string}>}
   */
  async getBalance(walletAddress, asset = 'XLM') {
    try {
      const result = queries.getBalance.get(walletAddress, asset);
      
      return {
        walletAddress,
        balance: result ? result.balance : 0,
        asset
      };
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      throw new Error('Erro ao consultar saldo');
    }
  }

  /**
   * Adiciona créditos à conta do usuário (simulação off-chain)
   * @param {string} walletAddress 
   * @param {number} amount 
   * @param {string} asset 
   * @returns {Promise<{walletAddress: string, balance: number, added: number}>}
   */
  async addCredits(walletAddress, amount, asset = 'XLM') {
    if (amount <= 0) {
      throw new Error('Valor deve ser positivo');
    }

    if (amount > 10) {
      throw new Error('Valor máximo para demo: 10 XLM');
    }

    try {
      // Buscar usuário
      const user = queries.getUserByWallet.get(walletAddress);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Buscar saldo atual
      const currentBalance = queries.getBalance.get(walletAddress, asset);
      
      if (currentBalance) {
        // Atualizar saldo existente
        const newBalance = currentBalance.balance + amount;
        queries.updateBalance.run(newBalance, user.id, asset);
        
        return {
          walletAddress,
          balance: newBalance,
          added: amount,
          asset
        };
      } else {
        // Criar novo saldo
        queries.createBalance.run(user.id, asset, amount);
        
        return {
          walletAddress,
          balance: amount,
          added: amount,
          asset
        };
      }
    } catch (error) {
      console.error('Erro ao adicionar créditos:', error);
      throw error;
    }
  }

  /**
   * Debita créditos da conta do usuário
   * @param {string} walletAddress 
   * @param {number} amount 
   * @param {string} asset 
   * @param {string} txHash - Hash da transação Stellar (opcional)
   * @returns {Promise<{walletAddress: string, balance: number, debited: number, txHash?: string}>}
   */
  async debitCredits(walletAddress, amount, asset = 'XLM', txHash = null) {
    if (amount <= 0) {
      throw new Error('Valor deve ser positivo');
    }

    try {
      // Buscar usuário
      const user = queries.getUserByWallet.get(walletAddress);
      if (!user) {
        throw new Error('Usuário não encontrado');
      }

      // Buscar saldo atual
      const currentBalance = queries.getBalance.get(walletAddress, asset);
      
      if (!currentBalance || currentBalance.balance < amount) {
        const available = currentBalance ? currentBalance.balance : 0;
        throw new Error(`Saldo insuficiente. Disponível: ${pricingService.formatAmount(available)}, Necessário: ${pricingService.formatAmount(amount)}`);
      }

      // Debitar
      const newBalance = currentBalance.balance - amount;
      queries.updateBalance.run(newBalance, user.id, asset);

      return {
        walletAddress,
        balance: newBalance,
        debited: amount,
        asset,
        txHash
      };
    } catch (error) {
      console.error('Erro ao debitar créditos:', error);
      throw error;
    }
  }

  /**
   * Verifica se o usuário tem saldo suficiente para uma operação
   * @param {string} walletAddress 
   * @param {number} requiredAmount 
   * @param {string} asset 
   * @returns {Promise<{sufficient: boolean, current: number, required: number, deficit?: number}>}
   */
  async checkSufficientBalance(walletAddress, requiredAmount, asset = 'XLM') {
    try {
      const balanceInfo = await this.getBalance(walletAddress, asset);
      return pricingService.validateBalance(balanceInfo.balance, requiredAmount);
    } catch (error) {
      console.error('Erro ao verificar saldo:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de uso de créditos
   * @param {string} walletAddress 
   * @returns {Promise<object>}
   */
  async getUsageStats(walletAddress) {
    try {
      const stats = queries.getUsageStats.get(walletAddress);
      
      return {
        totalRequests: stats?.total_requests || 0,
        totalCost: stats?.total_cost || 0,
        avgExecutionTime: stats?.avg_execution_time || 0,
        period: '30 dias'
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Processa pagamento de uma requisição de IA
   * @param {string} walletAddress 
   * @param {string} prompt 
   * @returns {Promise<{cost: object, balanceAfter: number}>}
   */
  async processAIPayment(walletAddress, prompt) {
    try {
      // Calcular custo
      const costInfo = pricingService.calculateCost(prompt);
      
      // Verificar saldo
      const balanceCheck = await this.checkSufficientBalance(walletAddress, costInfo.cost);
      
      if (!balanceCheck.sufficient) {
        const error = new Error('Saldo insuficiente');
        error.code = 'INSUFFICIENT_BALANCE';
        error.details = balanceCheck;
        throw error;
      }

      // Debitar créditos
      const result = await this.debitCredits(walletAddress, costInfo.cost);

      return {
        cost: costInfo,
        balanceAfter: result.balance
      };
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      throw error;
    }
  }
}

export default new CreditsService();
