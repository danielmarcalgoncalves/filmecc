const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';

function setAuthCookie(res, token) {
  res.cookie('access_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
}

function getBearerToken(req) {
  if (req.token) return req.token;
  if (req.cookies && req.cookies.access_token) return req.cookies.access_token;
  if (req.headers && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') return parts[1];
  }
  return null;
}

async function register(req, res) {
  try {
    const { nome, email, senha } = req.body;
    // Blindagem de segurança: qualquer campo 'papel' enviado pelo cliente é completamente descartado.
    // Todo novo registro no sistema é estritamente forçado como 'usuario' comum.
    const safePayload = {
      nome,
      email,
      senha,
      papel: 'usuario'
    };
    const response = await axios.post(`${AUTH_SERVICE_URL}/register`, safePayload);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function login(req, res) {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body);
    if (response.data && response.data.token) {
      setAuthCookie(res, response.data.token);
      if (response.data.usuario) {
        response.data.usuario.role = response.data.usuario.papel || 'usuario';
      }
    }
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function logout(req, res) {
  clearAuthCookie(res);
  return res.json({ message: 'Sessão finalizada com sucesso.' });
}

async function me(req, res) {
  try {
    const token = getBearerToken(req);
    const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : req.headers.authorization
      }
    });
    if (response.data && response.data.usuario) {
      response.data.usuario.role = response.data.usuario.papel || 'usuario';
    }
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    // Fallback gracioso para dados já autenticados e consultados do banco no authMiddleware
    if (req.usuario) {
      return res.json({ usuario: req.usuario });
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function forgotPassword(req, res) {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/forgot-password`, req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function resetPassword(req, res) {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/reset-password`, req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function listUsers(req, res) {
  try {
    const token = getBearerToken(req);
    const response = await axios.get(`${AUTH_SERVICE_URL}/users`, {
      headers: {
        Authorization: token ? `Bearer ${token}` : req.headers.authorization
      }
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function updateUserRole(req, res) {
  try {
    const token = getBearerToken(req);
    const response = await axios.patch(`${AUTH_SERVICE_URL}/users/${req.params.id}/role`, req.body, {
      headers: {
        Authorization: token ? `Bearer ${token}` : req.headers.authorization
      }
    });
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function verifyCode(req, res) {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/verify-code`, req.body);
    if (response.data && response.data.token) {
      setAuthCookie(res, response.data.token);
      if (response.data.usuario) {
        response.data.usuario.role = response.data.usuario.papel || 'usuario';
      }
    }
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function resendCode(req, res) {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/resend-code`, req.body);
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

module.exports = {
  register,
  verifyCode,
  resendCode,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  listUsers,
  updateUserRole
};

