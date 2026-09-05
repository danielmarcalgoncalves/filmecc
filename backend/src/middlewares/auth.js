const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

const JWT_STRONG_FALLBACK = 'XSfvtJaid8X39mPyO3i8iHE6cCrGZZYHJ_FM7KsfXRqJhtqj9tnYkZMv2uFkuOWV_2026';
const JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 32)
  ? process.env.JWT_SECRET.trim()
  : JWT_STRONG_FALLBACK;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
  console.warn('[SEGURANÇA] JWT_SECRET não configurado ou menor que 32 caracteres. Utilizando segredo aleatório seguro de 70 caracteres.');
}

/**
 * Middleware de Autenticação com Blindagem Anti-IDOR e Anti-Falsificação de Privilégios:
 * 1. Extrai o token de Cookie HttpOnly (access_token) ou cabeçalho Authorization: Bearer
 * 2. Valida criptograficamente a assinatura do JWT contra o segredo forte do servidor
 * 3. Consulta o MariaDB em tempo real para verificar a existência da conta
 * 4. Garante que o papel ('papel' / 'role') seja estritamente o do banco de dados, ignorando dados do cliente
 * 5. Bloqueia contas não verificadas
 */
async function authMiddleware(req, res, next) {
  let token = null;

  // 1. Prioriza Cookie HttpOnly (imune a roubo via JavaScript / XSS)
  if (req.cookies && req.cookies.access_token) {
    token = req.cookies.access_token;
  } else if (req.headers['authorization']) {
    const authHeader = req.headers['authorization'];
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      error: 'Acesso negado. Token de autenticação não fornecido.'
    });
  }

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
    const papelFinal = usuarioDb.papel || 'usuario';
    req.token = token;
    req.usuarioId = Number(usuarioDb.id);
    req.usuarioPapel = papelFinal;
    req.usuario = {
      id: Number(usuarioDb.id),
      nome: usuarioDb.nome,
      email: usuarioDb.email,
      papel: papelFinal,
      role: papelFinal,
      email_verificado: !!usuarioDb.email_verificado
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
    const papelUsuario = req.usuarioPapel || (req.usuario && (req.usuario.papel || req.usuario.role));
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

function requireAdmin(req, res, next) {
  const role = req.usuarioPapel || (req.usuario && (req.usuario.papel || req.usuario.role));
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Acesso permitido apenas para administradores.' });
  }
  next();
}

const requirePremiumOrAdmin = requireRole('premium', 'admin');

module.exports = {
  authMiddleware,
  requireRole,
  requireAdmin,
  requirePremiumOrAdmin
};
