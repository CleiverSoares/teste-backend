import express from 'express';
import { queries } from '../db/database.js';
import stellarService from '../services/stellarService.js';
import aiService from '../services/aiService.js';
import creditsService from '../services/creditsService.js';
import pricingService from '../services/pricingService.js';
import { createHash } from 'crypto';

const router = express.Router();

/**
 * GET /api/conversations
 * Lista conversas do usuário
 */
router.get('/', async (req, res) => {
  try {
    const { walletAddress, limit = 20, offset = 0 } = req.query;

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

    const limitNum = Math.min(parseInt(limit), 100);
    const offsetNum = Math.max(parseInt(offset), 0);

    const conversations = queries.getUserConversations.all(walletAddress, limitNum, offsetNum);

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      title: conv.title || `Conversa ${conv.id}`,
      messageCount: conv.message_count || 0,
      lastMessage: conv.last_message ? conv.last_message.substring(0, 100) + '...' : null,
      lastMessageAt: conv.last_message_at,
      createdAt: conv.created_at,
      updatedAt: conv.updated_at
    }));

    res.json({
      conversations: formattedConversations,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: conversations.length,
        hasMore: conversations.length === limitNum
      }
    });

  } catch (error) {
    console.error('Erro ao buscar conversas:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/conversations
 * Cria nova conversa
 */
router.post('/', async (req, res) => {
  try {
    const { walletAddress, title } = req.body;

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

    // Buscar ou criar usuário
    let user = queries.getUserByWallet.get(walletAddress);
    if (!user) {
      const createResult = queries.createUser.run(walletAddress, null, null, null, null);
      user = { id: createResult.lastInsertRowid, wallet_address: walletAddress };
    }

    // Criar conversa
    const result = queries.createConversation.run(
      user.id,
      title || `Conversa ${new Date().toLocaleString('pt-BR')}`
    );

    const conversation = {
      id: result.lastInsertRowid,
      title: title || `Conversa ${result.lastInsertRowid}`,
      messageCount: 0,
      lastMessage: null,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    res.json({
      conversation,
      message: 'Conversa criada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao criar conversa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/conversations/:id/messages
 * Lista mensagens de uma conversa
 */
router.get('/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Endereço da carteira é obrigatório',
        code: 'MISSING_WALLET_ADDRESS'
      });
    }

    // Verificar se a conversa pertence ao usuário
    const conversation = queries.getConversation.get(id, walletAddress);
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversa não encontrada',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    const messages = queries.getConversationMessages.all(id);

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content,
      tokens: msg.tokens,
      cost: {
        amount: msg.cost_amount || 0,
        asset: msg.cost_asset || 'XLM'
      },
      txHash: msg.tx_hash,
      executionTime: msg.execution_time,
      createdAt: msg.created_at,
      timestamp: new Date(msg.created_at).toLocaleString('pt-BR')
    }));

    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        createdAt: conversation.created_at
      },
      messages: formattedMessages,
      total: formattedMessages.length
    });

  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/conversations/:id/messages
 * Envia mensagem na conversa (chat)
 */
router.post('/:id/messages', async (req, res) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { walletAddress, message, secretKey } = req.body;

    if (!walletAddress || !message) {
      return res.status(400).json({
        error: 'Endereço da carteira e mensagem são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    // Verificar se a conversa pertence ao usuário
    const conversation = queries.getConversation.get(id, walletAddress);
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversa não encontrada',
        code: 'CONVERSATION_NOT_FOUND'
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

    console.log(`💬 === NOVA MENSAGEM NO CHAT ===`);
    console.log(`📍 Conversa ID: ${id}`);
    console.log(`👤 Usuário: ${walletAddress}`);
    console.log(`💬 Mensagem: ${message.substring(0, 50)}...`);
    console.log(`🔑 Chave secreta: ${secretKey ? 'Fornecida' : 'Não fornecida'}`);

    // Calcular custo
    const cost = pricingService.calculateCost(message);
    let paymentResult;
    let txHash = null;

    // Processar pagamento (real ou simulado)
    if (secretKey && secretKey.trim().length > 0) {
      console.log('💰 === MODO SALDO REAL ===');
      
      paymentResult = {
        walletAddress: walletAddress,
        balance: 999999,
        debited: cost.cost,
        asset: 'XLM',
        cost: cost,
        balanceAfter: 999999 - cost.cost
      };
      
      // Tentar criar transação Stellar real
      try {
        console.log('🔗 Criando transação Stellar...');
        console.log('💰 Custo para transação:', cost.cost, 'XLM');
        
        const stellarResult = await stellarService.createDemoTransaction(walletAddress, cost.cost);
        console.log('📦 Resultado Stellar:', stellarResult ? 'Criado' : 'Falhou');
        
        if (stellarResult && stellarResult.transactionXDR) {
          console.log('✍️ Assinando transação...');
          console.log('📝 XDR presente:', !!stellarResult.transactionXDR);
          
          const signResult = await stellarService.signAndSubmitTransaction(stellarResult.transactionXDR, secretKey);
          txHash = signResult.hash;
          console.log('✅ Transação enviada:', txHash);
        } else {
          console.log('❌ Não foi possível criar transação XDR');
          txHash = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
      } catch (stellarError) {
        console.error('❌ Erro na transação Stellar:', stellarError.message);
        console.error('❌ Stack trace:', stellarError.stack);
        txHash = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
    } else {
      console.log('💰 === MODO SALDO SIMULADO ===');
      try {
        paymentResult = await creditsService.processAIPayment(walletAddress, message);
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

    // Salvar mensagem do usuário
    const userMessageResult = queries.insertMessage.run(
      id, 'user', message, cost.tokens, 
      cost.cost, 'XLM', txHash, null
    );

    // Chamar IA para resposta
    console.log('🤖 Chamando IA...');
    const aiResult = await aiService.callAI(message);
    const executionTime = Date.now() - startTime;

    // Salvar resposta da IA
    const aiMessageResult = queries.insertMessage.run(
      id, 'assistant', aiResult.response, 0, 
      0, 'XLM', null, aiResult.executionTime
    );

    // Atualizar última mensagem da conversa
    queries.updateConversationLastMessage.run(id);

    // Registrar no log de uso (compatibilidade)
    try {
      const promptHash = createHash('sha256').update(message).digest('hex').substring(0, 16);
      const promptPreview = message.length > 50 ? message.substring(0, 50) + '...' : message;
      const responsePreview = aiResult.response.length > 100 ? aiResult.response.substring(0, 100) + '...' : aiResult.response;

      queries.insertUsageLog.run(
        user.id,
        promptHash,
        promptPreview,
        cost.tokens,
        'XLM',
        cost.cost,
        responsePreview,
        txHash,
        'completed',
        executionTime
      );
    } catch (logError) {
      console.error('Erro ao registrar log:', logError);
    }

    console.log('✅ Chat processado com sucesso!');

    res.json({
      messages: [
        {
          id: userMessageResult.lastInsertRowid,
          role: 'user',
          content: message,
          tokens: cost.tokens,
          cost: {
            amount: cost.cost,
            asset: 'XLM'
          },
          txHash: txHash,
          createdAt: new Date().toISOString()
        },
        {
          id: aiMessageResult.lastInsertRowid,
          role: 'assistant',
          content: aiResult.response,
          tokens: 0,
          cost: {
            amount: 0,
            asset: 'XLM'
          },
          executionTime: aiResult.executionTime,
          createdAt: new Date().toISOString()
        }
      ],
      cost: cost.cost,
      tokens: cost.tokens,
      tier: cost.tier,
      balanceAfter: paymentResult.balanceAfter,
      executionTime: executionTime,
      txHash: txHash,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no chat:', error);
    
    const executionTime = Date.now() - startTime;
    
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      executionTime
    });
  }
});

/**
 * DELETE /api/conversations/:id
 * Deleta uma conversa
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({
        error: 'Endereço da carteira é obrigatório',
        code: 'MISSING_WALLET_ADDRESS'
      });
    }

    // Verificar se a conversa pertence ao usuário
    const conversation = queries.getConversation.get(id, walletAddress);
    if (!conversation) {
      return res.status(404).json({
        error: 'Conversa não encontrada',
        code: 'CONVERSATION_NOT_FOUND'
      });
    }

    // Deletar conversa (mensagens são deletadas automaticamente por CASCADE)
    queries.deleteConversation.run(id);

    res.json({
      message: 'Conversa deletada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar conversa:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
