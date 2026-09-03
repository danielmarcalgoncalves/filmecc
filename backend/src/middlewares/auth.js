const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'segredo_jwt_tomhanks_super_seguro_2026';

function authMiddleware(req, res, next) {
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
    // Vincula estritamente o usuarioId e o papel (role) ao request
    req.usuarioId = decoded.id;
    req.usuarioPapel = decoded.papel || 'usuario';
    req.usuario = {
      id: decoded.id,
      nome: decoded.nome,
      email: decoded.email,
      papel: decoded.papel || 'usuario'
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

