import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class AIService {
  constructor() {
    this.provider = process.env.AI_PROVIDER || 'ollama';
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2:1b';
    this.openaiApiBase = process.env.OPENAI_API_BASE;
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  /**
   * Chama a IA com fallback automático
   * @param {string} prompt - O prompt para a IA
   * @returns {Promise<{response: string, executionTime: number}>}
   */
  async callAI(prompt) {
    const startTime = Date.now();
    
    console.log('🤖 === AI SERVICE - callAI ===');
    console.log('🔧 Provider configurado:', this.provider);
    console.log('🌐 Ollama URL:', this.ollamaBaseUrl);
    console.log('🤖 Ollama Model:', this.ollamaModel);
    console.log('💬 Prompt length:', prompt.length);
    
    try {
      // Tentar Ollama primeiro (modo padrão)
      if (this.provider === 'ollama') {
        console.log('🔄 Chamando Ollama...');
        const response = await this.callOllama(prompt);
        console.log('✅ Ollama respondeu com sucesso!');
        console.log('📝 Resposta length:', response.length);
        return {
          response,
          executionTime: Date.now() - startTime
        };
      }
      
      // Tentar OpenAI-compatível se configurado
      if (this.openaiApiBase && this.openaiApiKey) {
        const response = await this.callOpenAI(prompt);
        return {
          response,
          executionTime: Date.now() - startTime
        };
      }
      
      // Fallback para mock
      return this.callMock(prompt, startTime);
      
    } catch (error) {
      console.warn(`Erro no provider ${this.provider}:`, error.message);
      
      // Tentar fallbacks
      try {
        if (this.provider === 'ollama' && this.openaiApiBase && this.openaiApiKey) {
          console.log('🔄 Tentando fallback para OpenAI...');
          const response = await this.callOpenAI(prompt);
          return {
            response,
            executionTime: Date.now() - startTime
          };
        }
      } catch (fallbackError) {
        console.warn('Erro no fallback OpenAI:', fallbackError.message);
      }
      
      // Último recurso: mock
      console.log('🔄 Usando resposta mock...');
      return this.callMock(prompt, startTime);
    }
  }

  /**
   * Chama o Ollama local
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async callOllama(prompt) {
    // Melhorar o prompt para respostas diretas e relevantes
    const enhancedPrompt = `${prompt}

INSTRUÇÕES:
- Responda de forma DIRETA e RELEVANTE à pergunta
- Se pedirem uma resposta simples (como "ok"), responda exatamente isso
- Seja conciso e objetivo
- Use formatação clara quando necessário
- Não invente informações desnecessárias`;

    const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
      model: this.ollamaModel,
      prompt: enhancedPrompt,
      stream: false,
      options: {
        temperature: 0.3, // Mais determinístico
        num_predict: 200, // Respostas mais curtas
        top_p: 0.8,
        repeat_penalty: 1.1,
        stop: ["\n\n\n"] // Parar em quebras excessivas
      }
    }, {
      timeout: 120000, // 2 minutos para Ollama
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data || !response.data.response) {
      throw new Error('Resposta inválida do Ollama');
    }

    return response.data.response.trim();
  }

  /**
   * Chama API compatível com OpenAI
   * @param {string} prompt 
   * @returns {Promise<string>}
   */
  async callOpenAI(prompt) {
    const response = await axios.post(`${this.openaiApiBase}/chat/completions`, {
      model: this.openaiModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    }, {
      timeout: 30000,
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.data?.choices?.[0]?.message?.content) {
      throw new Error('Resposta inválida da API OpenAI');
    }

    return response.data.choices[0].message.content.trim();
  }

  /**
   * Resposta mock para desenvolvimento/fallback
   * @param {string} prompt 
   * @param {number} startTime 
   * @returns {object}
   */
  callMock(prompt, startTime) {
    // Simular delay realístico
    const mockDelay = Math.random() * 2000 + 1000; // 1-3 segundos
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const responses = [
          `Esta é uma resposta simulada para o seu prompt: "${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}"\n\nEm um ambiente de produção, esta resposta viria do modelo de IA configurado (Ollama ou OpenAI-compatível). Para ativar a IA real, configure as variáveis de ambiente apropriadas.`,
          
          `Olá! Recebi seu prompt sobre "${prompt.substring(0, 30)}${prompt.length > 30 ? '...' : ''}". Esta é uma resposta de demonstração.\n\nPara respostas reais de IA:\n- Configure o Ollama localmente, ou\n- Configure uma API compatível com OpenAI\n\nConsulte o README para instruções detalhadas.`,
          
          `Prompt processado com sucesso! 🤖\n\nSeu texto: "${prompt.substring(0, 40)}${prompt.length > 40 ? '...' : ''}"\n\nEsta é uma simulação. Para ativar IA real, verifique a configuração dos serviços de IA no arquivo .env do backend.`
        ];
        
        const randomResponse = responses[Math.floor(Math.random() * responses.length)];
        
        resolve({
          response: randomResponse,
          executionTime: Date.now() - startTime
        });
      }, mockDelay);
    });
  }

  /**
   * Verifica se algum provider está disponível
   * @returns {Promise<{available: boolean, provider: string, status: string}>}
   */
  async checkAvailability() {
    // Testar Ollama
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`, {
        timeout: 5000
      });
      
      if (response.status === 200) {
        return {
          available: true,
          provider: 'ollama',
          status: `Ollama disponível com ${response.data.models?.length || 0} modelos`
        };
      }
    } catch (error) {
      console.log('Ollama não disponível:', error.message);
    }

    // Testar OpenAI-compatível
    if (this.openaiApiBase && this.openaiApiKey) {
      try {
        const response = await axios.get(`${this.openaiApiBase}/models`, {
          timeout: 5000,
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`
          }
        });
        
        if (response.status === 200) {
          return {
            available: true,
            provider: 'openai',
            status: 'API OpenAI-compatível disponível'
          };
        }
      } catch (error) {
        console.log('OpenAI-compatível não disponível:', error.message);
      }
    }

    return {
      available: false,
      provider: 'mock',
      status: 'Usando respostas simuladas - configure um provider de IA'
    };
  }
}

export default new AIService();
