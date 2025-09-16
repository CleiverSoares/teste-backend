import express from 'express';
import { queries } from '../db/database.js';
import stellarService from '../services/stellarService.js';

const router = express.Router();

/**
 * POST /api/auth/wallet
 * Autentica usuário com endereço Stellar
 */
router.post('/wallet', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    // Validar entrada
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({
        error: 'Endereço da carteira é obrigatório',
        code: 'MISSING_WALLET_ADDRESS'
      });
    }

    // Validar formato Stellar
    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    // Buscar usuário existente
    let user = queries.getUserByWallet.get(walletAddress);

    // Criar usuário se não existir
    if (!user) {
      const result = queries.createUser.run(walletAddress, null, null, null, null);
      user = {
        id: result.lastInsertRowid,
        wallet_address: walletAddress,
        name: null,
        email: null,
        bio: null,
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Criar saldo inicial para demonstração
      queries.createBalance.run(user.id, 'XLM', 5.0); // 5 XLM para demo
    }

    // Verificar se a conta Stellar existe (opcional, apenas informativo)
    let stellarAccountInfo = null;
    try {
      stellarAccountInfo = await stellarService.checkAccountExists(walletAddress);
    } catch (error) {
      console.warn('Não foi possível verificar conta Stellar:', error.message);
    }

    // Buscar saldo atual
    const balance = queries.getBalance.get(walletAddress, 'XLM');

    res.json({
      userId: user.id,
      walletAddress: user.wallet_address,
      profile: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarUrl: user.avatar_url
      },
      stellarAccount: stellarAccountInfo,
      balance: balance ? balance.balance : 0,
      message: user.created_at === user.updated_at 
        ? 'Usuário criado com sucesso' 
        : 'Login realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/auth/profile/:walletAddress
 * Busca perfil do usuário
 */
router.get('/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const user = queries.getUserByWallet.get(walletAddress);

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    res.json({
      walletAddress: user.wallet_address,
      profile: {
        name: user.name,
        email: user.email,
        bio: user.bio,
        avatarUrl: user.avatar_url
      },
      createdAt: user.created_at,
      updatedAt: user.updated_at
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/auth/profile/:walletAddress
 * Atualiza perfil do usuário
 */
router.put('/profile/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const { name, email, bio, avatarUrl } = req.body;

    if (!stellarService.isValidStellarAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Endereço Stellar inválido',
        code: 'INVALID_STELLAR_ADDRESS'
      });
    }

    const user = queries.getUserByWallet.get(walletAddress);

    if (!user) {
      return res.status(404).json({
        error: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    // Validar dados
    if (name && (typeof name !== 'string' || name.length > 100)) {
      return res.status(400).json({
        error: 'Nome deve ter no máximo 100 caracteres',
        code: 'INVALID_NAME'
      });
    }

    if (email && (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return res.status(400).json({
        error: 'Email inválido',
        code: 'INVALID_EMAIL'
      });
    }

    if (bio && (typeof bio !== 'string' || bio.length > 500)) {
      return res.status(400).json({
        error: 'Bio deve ter no máximo 500 caracteres',
        code: 'INVALID_BIO'
      });
    }

    // Atualizar perfil
    queries.updateUser.run(
      name || user.name,
      email || user.email,
      bio || user.bio,
      avatarUrl || user.avatar_url,
      user.id
    );

    res.json({
      walletAddress,
      profile: {
        name: name || user.name,
        email: email || user.email,
        bio: bio || user.bio,
        avatarUrl: avatarUrl || user.avatar_url
      },
      message: 'Perfil atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

export default router;
