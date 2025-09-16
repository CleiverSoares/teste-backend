import * as StellarSdk from '@stellar/stellar-sdk';
import dotenv from 'dotenv';

dotenv.config();

class StellarService {
  constructor() {
    this.network = process.env.STELLAR_NETWORK || 'testnet';
    this.horizonUrl = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
    this.server = new StellarSdk.Horizon.Server(this.horizonUrl);
    this.networkPassphrase = this.network === 'testnet' 
      ? StellarSdk.Networks.TESTNET 
      : StellarSdk.Networks.PUBLIC;
  }

  /**
   * Valida se um endereço Stellar é válido
   * @param {string} address 
   * @returns {boolean}
   */
  isValidStellarAddress(address) {
    try {
      if (!address || typeof address !== 'string') {
        return false;
      }
      
      // Limpar espaços
      address = address.trim();
      
      // Verificar formato básico (G + 55 caracteres Base32)
      if (!/^G[A-Z2-7]{55}$/.test(address) || address.length !== 56) {
        return false;
      }
      
      // Tentar criar keypair para validar checksum
      StellarSdk.Keypair.fromPublicKey(address);
      return true;
    } catch (error) {
      console.warn('Endereço Stellar inválido:', error.message);
      return false;
    }
  }

  /**
   * Busca saldos de uma conta Stellar
   * @param {string} accountId 
   * @returns {Promise<Array>}
   */
  async getAccountBalances(accountId) {
    try {
      if (!this.isValidStellarAddress(accountId)) {
        throw new Error('Endereço Stellar inválido');
      }

      const account = await this.server.loadAccount(accountId);
      
      return account.balances.map(balance => ({
        asset: balance.asset_type === 'native' 
          ? 'XLM' 
          : `${balance.asset_code}:${balance.asset_issuer}`,
        balance: parseFloat(balance.balance),
        limit: balance.limit ? parseFloat(balance.limit) : null
      }));
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('Conta não encontrada na rede Stellar. Certifique-se de que a conta foi ativada.');
      }
      
      console.error('Erro ao buscar saldos Stellar:', error);
      throw new Error(`Erro ao consultar saldos: ${error.message}`);
    }
  }

  /**
   * Cria uma transação real no Stellar testnet (não assinada)
   * @param {string} sourceAddress 
   * @returns {Promise<{txHash: string, amount: string, fee: string, transactionXDR: string}>}
   */
  async createDemoTransaction(sourceAddress, promptCost = 0.0000001) {
    console.log('🔗 === STELLAR SERVICE - createDemoTransaction ===');
    console.log('📍 sourceAddress:', sourceAddress);
    console.log('💰 promptCost:', promptCost);
    
    try {
      if (!this.isValidStellarAddress(sourceAddress)) {
        console.error('❌ Endereço Stellar inválido:', sourceAddress);
        throw new Error('Endereço Stellar inválido');
      }
      
      console.log('✅ Endereço Stellar válido');

      // Carregar conta real do usuário
      console.log('🔍 Carregando conta do Stellar...');
      const account = await this.server.loadAccount(sourceAddress);
      console.log('✅ Conta carregada com sucesso');
      
      // Verificar se tem saldo suficiente
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      if (!xlmBalance || parseFloat(xlmBalance.balance) < 0.0001) {
        throw new Error('Saldo insuficiente para transação. Mínimo: 0.0001 XLM');
      }

      // Converter custo para formato adequado
      let amountInXLM;
      
      console.log(`💰 Prompt cost original: ${promptCost}`);
      
      // Garantir que promptCost é um número
      const costAsNumber = typeof promptCost === 'number' ? promptCost : parseFloat(promptCost);
      console.log(`💰 Custo convertido para número: ${costAsNumber}`);
      
      // Validar valor mínimo (Stellar requer mínimo de 0.0000001 XLM)
      if (costAsNumber < 0.0000001) {
        console.log(`⚠️ Valor muito baixo (${costAsNumber}), usando mínimo 0.0000001 XLM`);
        amountInXLM = '0.0000001';
      } else {
        amountInXLM = costAsNumber.toFixed(7);
      }
      
      console.log(`💰 Criando transação com valor real: ${amountInXLM} XLM`);

      // Criar transação real com valor baseado no custo do prompt
      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: '100', // 0.00001 XLM (fee mínima)
        networkPassphrase: this.networkPassphrase
      })
      .addOperation(StellarSdk.Operation.payment({
        destination: sourceAddress, // Pagar para si mesmo
        asset: StellarSdk.Asset.native(),
        amount: amountInXLM // Valor em XLM (string decimal)
      }))
      .addMemo(StellarSdk.Memo.text(`AI Gateway: ${amountInXLM}XLM`))
      .setTimeout(180)
      .build();

      const transactionXDR = transaction.toXDR();
      console.log('📦 Transação criada (não assinada)');
      console.log('📦 XDR length:', transactionXDR.length);
      console.log('📦 XDR preview:', transactionXDR.substring(0, 50) + '...');
      
      return {
        txHash: null, // Será preenchido após assinatura
        amount: `${amountInXLM} XLM`,
        fee: '0.00001 XLM',
        destination: sourceAddress,
        memo: `AI Gateway: ${amountInXLM}XLM`,
        ledger: 'pending',
        timestamp: new Date().toISOString(),
        note: 'Transação criada - requer assinatura do usuário',
        transactionXDR: transaction.toXDR(),
        needsSignature: true,
        promptCost: promptCost
      };
    } catch (error) {
      console.error('Erro na transação:', error);
      
      // Se a conta não existir ou não tiver saldo, retornar erro específico
      if (error.message.includes('não encontrada') || error.message.includes('Saldo insuficiente')) {
        throw error;
      }
      
      // Para outros erros, retornar transação simulada
      const amountInXLM = (promptCost * 10000000 / 10000000).toFixed(7);
      return {
        txHash: `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        amount: `${amountInXLM} XLM`,
        fee: '0.00001 XLM',
        destination: sourceAddress,
        memo: `AI Gateway: ${amountInXLM}XLM (sim)`,
        ledger: 'simulado',
        timestamp: new Date().toISOString(),
        note: 'Transação simulada - conta não encontrada ou sem saldo',
        needsSignature: false,
        promptCost: promptCost
      };
    }
  }

  /**
   * Obtém saldo real da conta Stellar usando chave secreta
   * @param {string} secretKey - Chave secreta da conta
   * @returns {Promise<{balance: number, address: string, balances: Array}>}
   */
  async getRealBalance(secretKey) {
    console.log('💰 === STELLAR SERVICE - getRealBalance ===');
    console.log('🔑 Buscando saldo real com chave secreta...');
    
    try {
      // Validar e criar keypair
      let keypair;
      try {
        keypair = StellarSdk.Keypair.fromSecret(secretKey);
        console.log('✅ Keypair criado para:', keypair.publicKey());
      } catch (error) {
        console.error('❌ Chave secreta inválida:', error.message);
        throw new Error('Chave secreta inválida');
      }

      const publicKey = keypair.publicKey();
      
      // Buscar dados da conta na rede Stellar
      console.log('🔍 Consultando conta na rede Stellar...');
      const account = await this.server.loadAccount(publicKey);
      console.log('✅ Conta carregada com sucesso');
      
      // Extrair saldos
      const balances = account.balances.map(balance => ({
        asset: balance.asset_type === 'native' ? 'XLM' : `${balance.asset_code}:${balance.asset_issuer}`,
        balance: parseFloat(balance.balance),
        asset_type: balance.asset_type,
        asset_code: balance.asset_code,
        asset_issuer: balance.asset_issuer
      }));

      // Encontrar saldo XLM
      const xlmBalance = balances.find(b => b.asset === 'XLM');
      const xlmAmount = xlmBalance ? xlmBalance.balance : 0;
      
      console.log(`💰 Saldo real encontrado: ${xlmAmount} XLM`);
      console.log(`📊 Total de assets: ${balances.length}`);
      
      return {
        address: publicKey,
        balance: xlmAmount,
        balances: balances,
        account: {
          sequence: account.sequenceNumber(),
          subentry_count: account.subentryCount,
          thresholds: account.thresholds
        }
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar saldo real:', error.message);
      if (error.response?.status === 404) {
        throw new Error('Conta não encontrada na rede Stellar. Verifique se a conta foi ativada.');
      }
      throw new Error(`Erro ao consultar saldo: ${error.message}`);
    }
  }

  /**
   * Assina e envia uma transação Stellar
   * @param {string} transactionXDR - Transação em formato XDR
   * @param {string} secretKey - Chave secreta para assinar
   * @returns {Promise<{txHash: string, success: boolean}>}
   */
  async signAndSubmitTransaction(transactionXDR, secretKey) {
    console.log('✍️ === STELLAR SERVICE - signAndSubmitTransaction ===');
    console.log('📦 transactionXDR recebido:', !!transactionXDR);
    console.log('📦 transactionXDR length:', transactionXDR?.length);
    console.log('🔑 secretKey recebida:', !!secretKey);
    console.log('🔑 secretKey length:', secretKey?.length);
    console.log('🔑 secretKey preview:', secretKey ? secretKey.substring(0, 10) + '...' : 'N/A');
    
    try {
      
      // Validar chave secreta
      let keypair;
      try {
        keypair = StellarSdk.Keypair.fromSecret(secretKey);
        console.log('  ✅ Keypair criado:', keypair.publicKey());
      } catch (error) {
        console.error('  ❌ Erro ao criar keypair:', error.message);
        throw new Error('Chave secreta inválida');
      }

      // Verificar se a chave pública corresponde ao endereço da transação
      console.log('  🔍 Criando transação a partir do XDR...');
      const transaction = StellarSdk.TransactionBuilder.fromXDR(transactionXDR, this.networkPassphrase);
      const sourceAccount = transaction.source;
      console.log('  📍 Source account da transação:', sourceAccount);
      console.log('  🔑 Chave pública do keypair:', keypair.publicKey());
      
      if (keypair.publicKey() !== sourceAccount) {
        throw new Error('Chave secreta não corresponde ao endereço da transação');
      }

      // Assinar a transação
      console.log('  ✍️ Assinando transação...');
      transaction.sign(keypair);

      // Enviar para a rede
      console.log('  📤 Enviando transação para a rede...');
      const result = await this.server.submitTransaction(transaction);
      console.log('  📊 Resultado da submissão:', result);

      return {
        hash: result.hash,
        txHash: result.hash, // Compatibilidade
        success: true,
        ledger: result.ledger,
        timestamp: new Date().toISOString(),
        note: 'Transação enviada com sucesso para a rede Stellar'
      };
    } catch (error) {
      console.error('Erro ao assinar/enviar transação:', error);
      
      if (error.response?.data?.extras?.result_codes) {
        const codes = error.response.data.extras.result_codes;
        throw new Error(`Erro na transação: ${codes.transaction || 'Desconhecido'}`);
      }
      
      throw new Error(`Erro ao processar transação: ${error.message}`);
    }
  }

  generateMockTxHash() {
    // Gerar um hash simulado que parece real
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Verifica se uma conta existe e está ativa
   * @param {string} accountId 
   * @returns {Promise<{exists: boolean, balance?: number}>}
   */
  async checkAccountExists(accountId) {
    try {
      if (!this.isValidStellarAddress(accountId)) {
        return { exists: false, error: 'Endereço inválido' };
      }

      const account = await this.server.loadAccount(accountId);
      const xlmBalance = account.balances.find(b => b.asset_type === 'native');
      
      return {
        exists: true,
        balance: xlmBalance ? parseFloat(xlmBalance.balance) : 0,
        sequence: account.sequence
      };
    } catch (error) {
      if (error.response?.status === 404) {
        return { 
          exists: false, 
          error: 'Conta não encontrada. A conta precisa ser ativada com pelo menos 1 XLM.' 
        };
      }
      
      return { 
        exists: false, 
        error: `Erro ao verificar conta: ${error.message}` 
      };
    }
  }

  /**
   * Gera um endereço Stellar aleatório para testes
   * APENAS para desenvolvimento/demonstração
   * @returns {object}
   */
  generateTestAddress() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Geração de endereços não permitida em produção');
    }

    const keypair = StellarSdk.Keypair.random();
    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
      network: this.network,
      warning: 'Este é um endereço de teste. Não use em produção!'
    };
  }

  /**
   * Obtém informações da rede Stellar
   * @returns {Promise<object>}
   */
  async getNetworkInfo() {
    try {
      const ledger = await this.server.ledgers().order('desc').limit(1).call();
      const latestLedger = ledger.records[0];
      
      return {
        network: this.network,
        horizonUrl: this.horizonUrl,
        latestLedger: {
          sequence: latestLedger.sequence,
          hash: latestLedger.hash,
          timestamp: latestLedger.closed_at
        }
      };
    } catch (error) {
      console.error('Erro ao buscar info da rede:', error);
      throw new Error('Erro ao consultar informações da rede Stellar');
    }
  }
}

export default new StellarService();
