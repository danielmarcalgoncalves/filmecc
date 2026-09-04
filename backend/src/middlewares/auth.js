const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_jwt_tomhanks_super_seguro_2026';

/**
 * Middleware de Autenticação com Blindagem Anti-IDOR e Anti-Falsificação de Privilégios:
 * 1. Valida criptograficamente o JWT
 * 2. Consulta o MariaDB em tempo real para verificar a existência da conta
 * 3. Garante que o papel ('papel') seja estritamente o do banco de dados, ignorando dados forjados no token
 * 4. Bloqueia contas não verificadas
 */
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      error: 'Acesso negado. Token de autenticação não fornecido.'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. Esperado: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded || !decoded.id) {
      return res.status(401).json({
        error: 'Token inválido. Identificador de usuário ausente.'
      });
    }

    // Consulta no MariaDB para validar em tempo real (Defesa Anti-IDOR e Anti-Privilege Escalation)
    const [rows] = await pool.query(
      'SELECT id, nome, email, papel, email_verificado FROM usuarios WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Sessão inválida: Usuário não encontrado ou conta revogada.'
      });
    }

    const usuarioDb = rows[0];

    // Bloqueia contas cujo e-mail ainda não foi confirmado via OTP
    if (usuarioDb.email_verificado === 0 || usuarioDb.email_verificado === false) {
      return res.status(403).json({
        error: 'Acesso bloqueado: Seu e-mail ainda não foi confirmado. Por favor, valide o código de verificação enviado.',
        requireVerification: true,
        email: usuarioDb.email
      });
    }

    // Associa dados validados diretamente do banco de dados ao request (imutáveis)
    req.usuarioId = Number(usuarioDb.id);
    req.usuarioPapel = usuarioDb.papel || 'usuario';
    req.usuario = {
      id: Number(usuarioDb.id),
      nome: usuarioDb.nome,
      email: usuarioDb.email,
      papel: usuarioDb.papel || 'usuario'
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido ou expirado. Faça login novamente.'
    });
  }
}

/**
 * Middleware RBAC: Valida se o papel do usuário autenticado tem autorização para o endpoint.
 * Retorna 403 Forbidden caso o papel não seja permitido.
 * @param  {...string} papeisPermitidos - Lista de papéis autorizados (ex: 'admin', 'premium')
 */
function requireRole(...papeisPermitidos) {
  return (req, res, next) => {
    const papelUsuario = req.usuarioPapel || (req.usuario && req.usuario.papel);
    if (!papelUsuario || !papeisPermitidos.includes(papelUsuario)) {
      console.warn(`[RBAC BLOCK] Usuário ID ${req.usuarioId} com papel "${papelUsuario}" tentou acessar rota exclusiva para [${papeisPermitidos.join(', ')}].`);
      return res.status(403).json({
        error: 'Acesso proibido (403 Forbidden). Seu papel de usuário não possui permissão para realizar esta ação sensível.',
        papelAtual: papelUsuario || 'desconhecido',
        papeisPermitidos
      });
    }
    next();
  };
}

const requireAdmin = requireRole('admin');
const requirePremiumOrAdmin = requireRole('premium', 'admin');

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requirePremiumOrAdmin
};
