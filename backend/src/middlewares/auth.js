const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tom_hanks_segredo_jwt_seguranca_2026';

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
    // Vincula estritamente o usuarioId ao request
    req.usuarioId = decoded.id;
    req.usuario = {
      id: decoded.id,
      nome: decoded.nome,
      email: decoded.email
    };
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Token inválido ou expirado. Faça login novamente.'
    });
  }
}

module.exports = authMiddleware;
