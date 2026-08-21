const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'tom_hanks_segredo_jwt_seguranca_2026';

// Cadastro de novos usuários
async function register(req, res) {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios.' });
    }

    if (senha.length < 4) {
      return res.status(400).json({ error: 'A senha deve conter no mínimo 4 caracteres.' });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Verifica se o e-mail já está cadastrado
    const [existingUsers] = await pool.query(
      'SELECT id FROM usuarios WHERE email = ? LIMIT 1',
      [emailTrimmed]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado. Faça login.' });
    }

    // Gera o hash da senha
    const senhaHash = await bcrypt.hash(senha, 10);

    // Insere o novo usuário
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome.trim(), emailTrimmed, senhaHash]
    );

    const novoUsuarioId = result.insertId;

    // Gera o token JWT
    const token = jwt.sign(
      { id: novoUsuarioId, nome: nome.trim(), email: emailTrimmed },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      usuario: {
        id: novoUsuarioId,
        nome: nome.trim(),
        email: emailTrimmed
      }
    });
  } catch (error) {
    console.error('[Auth Controller] Erro no registro:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar cadastro.' });
  }
}

// Login de usuários existentes
async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const emailTrimmed = email.trim().toLowerCase();

    // Busca o usuário no banco
    const [users] = await pool.query(
      'SELECT id, nome, email, senha_hash FROM usuarios WHERE email = ? LIMIT 1',
      [emailTrimmed]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    const usuario = users[0];

    // Valida a senha com bcrypt
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
    }

    // Gera o token JWT
    const token = jwt.sign(
      { id: usuario.id, nome: usuario.nome, email: usuario.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login realizado com sucesso!',
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email
      }
    });
  } catch (error) {
    console.error('[Auth Controller] Erro no login:', error);
    return res.status(500).json({ error: 'Erro interno ao realizar login.' });
  }
}

// Retorna dados do usuário autenticado atual
async function me(req, res) {
  try {
    const [users] = await pool.query(
      'SELECT id, nome, email, criado_em FROM usuarios WHERE id = ? LIMIT 1',
      [req.usuarioId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({ usuario: users[0] });
  } catch (error) {
    console.error('[Auth Controller] Erro no endpoint me:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar perfil.' });
  }
}

module.exports = {
  register,
  login,
  me
};
