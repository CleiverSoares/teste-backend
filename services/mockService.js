// Mock service para Vercel (sem SQLite)

// Mock database em memória
const mockUsers = new Map();
const mockCredits = new Map();
const mockUsageLogs = [];
const mockConversations = new Map();
const mockMessages = new Map();

let nextUserId = 1;
let nextConversationId = 1;
let nextMessageId = 1;

export const mockDatabase = {
  // Users
  createUser(walletAddress, profile = {}) {
    const userId = nextUserId++;
    const user = {
      id: userId,
      wallet_address: walletAddress,
      name: profile.name || null,
      email: profile.email || null,
      bio: profile.bio || null,
      avatar_url: profile.avatar_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockUsers.set(walletAddress, user);
    
    // Criar créditos iniciais
    mockCredits.set(`${userId}_XLM`, {
      id: userId,
      user_id: userId,
      asset: 'XLM',
      balance: 20000.0, // Saldo inicial generoso para demo
      updated_at: new Date().toISOString()
    });
    
    return user;
  },

  getUserByWallet(walletAddress) {
    return mockUsers.get(walletAddress) || null;
  },

  updateUser(walletAddress, updates) {
    const user = mockUsers.get(walletAddress);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    mockUsers.set(walletAddress, updatedUser);
    return updatedUser;
  },

  // Credits
  getCredits(userId, asset = 'XLM') {
    return mockCredits.get(`${userId}_${asset}`) || null;
  },

  updateCredits(userId, asset, newBalance) {
    const key = `${userId}_${asset}`;
    const existing = mockCredits.get(key);
    
    if (!existing) {
      mockCredits.set(key, {
        id: userId,
        user_id: userId,
        asset,
        balance: newBalance,
        updated_at: new Date().toISOString()
      });
    } else {
      existing.balance = newBalance;
      existing.updated_at = new Date().toISOString();
    }
    
    return mockCredits.get(key);
  },

  // Usage logs
  createUsageLog(userId, logData) {
    const log = {
      id: mockUsageLogs.length + 1,
      user_id: userId,
      ...logData,
      created_at: new Date().toISOString()
    };
    
    mockUsageLogs.push(log);
    return log;
  },

  getUsageLogs(userId, limit = 50, offset = 0) {
    const userLogs = mockUsageLogs
      .filter(log => log.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(offset, offset + limit);
    
    return userLogs;
  },

  getUsageStats(userId) {
    const userLogs = mockUsageLogs.filter(log => log.user_id === userId);
    const totalRequests = userLogs.length;
    const totalCost = userLogs.reduce((sum, log) => sum + (log.cost_amount || 0), 0);
    const avgTime = userLogs.length > 0 
      ? userLogs.reduce((sum, log) => sum + (log.execution_time || 0), 0) / userLogs.length
      : 0;

    return {
      totalRequests,
      totalCost,
      avgExecutionTime: Math.round(avgTime),
      period: '30 days'
    };
  },

  // Conversations
  createConversation(userId, title = null) {
    const conversationId = nextConversationId++;
    const conversation = {
      id: conversationId,
      user_id: userId,
      title: title || `Conversa ${conversationId}`,
      last_message_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    mockConversations.set(conversationId, conversation);
    return conversation;
  },

  getConversations(userId) {
    return Array.from(mockConversations.values())
      .filter(conv => conv.user_id === userId)
      .sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
  },

  getConversation(conversationId) {
    return mockConversations.get(conversationId) || null;
  },

  updateConversation(conversationId, updates) {
    const conversation = mockConversations.get(conversationId);
    if (!conversation) return null;
    
    const updated = {
      ...conversation,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    mockConversations.set(conversationId, updated);
    return updated;
  },

  deleteConversation(conversationId) {
    // Deletar mensagens da conversa
    const conversationMessages = Array.from(mockMessages.values())
      .filter(msg => msg.conversation_id === conversationId);
    
    conversationMessages.forEach(msg => {
      mockMessages.delete(msg.id);
    });
    
    // Deletar conversa
    return mockConversations.delete(conversationId);
  },

  // Messages
  createMessage(conversationId, role, content, metadata = {}) {
    const messageId = nextMessageId++;
    const message = {
      id: messageId,
      conversation_id: conversationId,
      role,
      content,
      tokens: metadata.tokens || 0,
      cost_amount: metadata.cost_amount || 0,
      cost_asset: metadata.cost_asset || 'XLM',
      tx_hash: metadata.tx_hash || null,
      execution_time: metadata.execution_time || 0,
      created_at: new Date().toISOString()
    };
    
    mockMessages.set(messageId, message);
    
    // Atualizar última mensagem da conversa
    const conversation = mockConversations.get(conversationId);
    if (conversation) {
      conversation.last_message_at = message.created_at;
      conversation.updated_at = message.created_at;
    }
    
    return message;
  },

  getMessages(conversationId) {
    return Array.from(mockMessages.values())
      .filter(msg => msg.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }
};

// Mock AI responses
export const mockAIResponses = [
  "Olá! Como posso ajudá-lo hoje?",
  "Essa é uma pergunta interessante. Deixe-me pensar sobre isso...",
  "Baseado no que você disse, acredito que a melhor abordagem seria...",
  "Entendo sua dúvida. Vou explicar de forma simples:",
  "Excelente pergunta! Aqui estão algumas considerações importantes:",
  "Posso ajudar com isso. Vamos começar pelo básico:",
  "Essa situação é comum. Aqui está o que recomendo:",
  "Ótima observação! Você está no caminho certo.",
  "Vou dar um exemplo prático para esclarecer:",
  "Resumindo: essa é uma questão complexa que envolve vários fatores."
];

export function getRandomMockResponse() {
  return mockAIResponses[Math.floor(Math.random() * mockAIResponses.length)];
}

// Função para estimar tokens (aproximação simples)
export function estimateTokens(text) {
  // Aproximação: 1 token ≈ 4 caracteres
  return Math.ceil(text.length / 4);
}
