// Serviço de comunicação com o Backend Node.js
// O Frontend NUNCA acessa o TMDB diretamente nem possui chaves/senhas expostas.

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('tomhanks_token');
}

function setSession(token, usuario) {
  if (token) {
    localStorage.setItem('tomhanks_token', token);
  }
  if (usuario) {
    localStorage.setItem('tomhanks_user', JSON.stringify(usuario));
  }
}

function clearSession() {
  localStorage.removeItem('tomhanks_token');
  localStorage.removeItem('tomhanks_user');
}

function getStoredUser() {
  try {
    const userStr = localStorage.getItem('tomhanks_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    const errorMsg = data.error || data.message || `Erro na requisição (${response.status})`;
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  auth: {
    async register(nome, email, senha) {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ nome, email, senha })
      });
      setSession(data.token, data.usuario);
      return data;
    },

    async login(email, senha) {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha })
      });
      setSession(data.token, data.usuario);
      return data;
    },

    async getMe() {
      return await apiRequest('/auth/me');
    },

    logout() {
      clearSession();
    },

    getToken,
    getStoredUser
  },

  movies: {
    async getTomHanks() {
      return await apiRequest('/movies/tom-hanks');
    }
  },

  favorites: {
    async getAll() {
      return await apiRequest('/favorites');
    },

    async add(tmdb_movie_id, titulo, poster_path) {
      return await apiRequest('/favorites', {
        method: 'POST',
        body: JSON.stringify({ tmdb_movie_id, titulo, poster_path })
      });
    },

    async remove(movieId) {
      return await apiRequest(`/favorites/${movieId}`, {
        method: 'DELETE'
      });
    }
  },

  comments: {
    async getAll() {
      return await apiRequest('/comments');
    },

    async getForMovie(movieId) {
      return await apiRequest(`/comments/movie/${movieId}`);
    },

    async add(tmdb_movie_id, texto) {
      return await apiRequest('/comments', {
        method: 'POST',
        body: JSON.stringify({ tmdb_movie_id, texto })
      });
    },

    async delete(commentId) {
      return await apiRequest(`/comments/${commentId}`, {
        method: 'DELETE'
      });
    }
  }
};
