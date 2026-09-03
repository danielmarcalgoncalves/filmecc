const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3000';

async function register(req, res) {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/register`, req.body);
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
    return res.status(response.status).json(response.data);
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    return res.status(500).json({ error: 'Erro interno ao contatar o serviço de autenticação.' });
  }
}

async function me(req, res) {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/me`, {
      headers: {
        Authorization: req.headers.authorization
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
    const response = await axios.get(`${AUTH_SERVICE_URL}/users`, {
      headers: {
        Authorization: req.headers.authorization
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
    const response = await axios.patch(`${AUTH_SERVICE_URL}/users/${req.params.id}/role`, req.body, {
      headers: {
        Authorization: req.headers.authorization
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

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  listUsers,
  updateUserRole
};

