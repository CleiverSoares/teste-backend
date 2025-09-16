import dotenv from 'dotenv';

dotenv.config();

class PricingService {
  constructor() {
    this.priceShort = parseFloat(process.env.PRICE_SHORT_XLM) || 0.02;
    this.priceLong = parseFloat(process.env.PRICE_LONG_XLM) || 0.05;
    this.shortLimitTokens = parseInt(process.env.SHORT_LIMIT_TOKENS) || 300;
  }

  /**
   * Estima o número de tokens baseado no comprimento do prompt
   * @param {string} prompt 
   * @returns {number}
   */
  estimateTokens(prompt) {
    // Estimativa simples: ~4 caracteres por token
    return Math.ceil(prompt.length / 4);
  }

  /**
   * Calcula o custo baseado no prompt
   * @param {string} prompt 
   * @returns {{tokens: number, cost: number, tier: 'short'|'long'}}
   */
  calculateCost(prompt) {
    const tokens = this.estimateTokens(prompt);
    const isShort = tokens <= this.shortLimitTokens;
    
    return {
      tokens,
      cost: isShort ? this.priceShort : this.priceLong,
      tier: isShort ? 'short' : 'long'
    };
  }

  /**
   * Retorna informações de preços para o frontend
   * @returns {object}
   */
  getPricingInfo() {
    return {
      short: {
        price: this.priceShort,
        maxTokens: this.shortLimitTokens,
        description: 'Prompts curtos e diretos'
      },
      long: {
        price: this.priceLong,
        minTokens: this.shortLimitTokens + 1,
        description: 'Prompts longos e complexos'
      },
      asset: 'XLM',
      estimationMethod: 'Baseado no comprimento do texto (~4 chars/token)'
    };
  }

  /**
   * Valida se o usuário tem saldo suficiente
   * @param {number} userBalance 
   * @param {number} requiredAmount 
   * @returns {{sufficient: boolean, required: number, current: number, deficit?: number}}
   */
  validateBalance(userBalance, requiredAmount) {
    const sufficient = userBalance >= requiredAmount;
    const result = {
      sufficient,
      required: requiredAmount,
      current: userBalance
    };

    if (!sufficient) {
      result.deficit = requiredAmount - userBalance;
    }

    return result;
  }

  /**
   * Formata valor em XLM para exibição
   * @param {number} amount 
   * @returns {string}
   */
  formatAmount(amount) {
    return `${amount.toFixed(4)} XLM`;
  }

  /**
   * Converte valor para stroops (menor unidade Stellar)
   * @param {number} xlm 
   * @returns {string}
   */
  toStroops(xlm) {
    return (xlm * 10000000).toString();
  }

  /**
   * Converte stroops para XLM
   * @param {string} stroops 
   * @returns {number}
   */
  fromStroops(stroops) {
    return parseFloat(stroops) / 10000000;
  }
}

export default new PricingService();
