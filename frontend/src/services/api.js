// Serviço de comunicação com o Backend Node.js
// O Frontend NUNCA acessa o TMDB diretamente nem possui chaves/senhas expostas.

const API_BASE = '/api';

// Token mantido apenas em memória durante a sessão (mitigação contra roubo por XSS via localStorage)
let inMemoryToken = null;

function getToken() {
  return inMemoryToken;
}

function setSession(token) {
  if (token) {
    inMemoryToken = token;
  }
  // Remove dados sensíveis do localStorage caso tenham sido salvos anteriormente
  localStorage.removeItem('tomhanks_token');
  localStorage.removeItem('tomhanks_user');
}

function clearSession() {
  inMemoryToken = null;
  localStorage.removeItem('tomhanks_token');
  localStorage.removeItem('tomhanks_user');
}

function getStoredUser() {
  // SEGURANÇA: O localStorage NÃO é fonte de autenticação nem de autorização.
  // A sessão legítima é obtida e validada diretamente no backend via /api/auth/me.
  return null;
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

  // credentials: 'include' envia automaticamente o cookie HttpOnly access_token
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    const errorMsg = data.error || data.message || `Erro na requisição (${response.status})`;
    const err = new Error(errorMsg);
    err.requireVerification = data.requireVerification;
    err.email = data.email;
    throw err;
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
      if (data.token) {
        setSession(data.token);
      }
      return data;
    },

    async verifyCode(email, codigo) {
      const data = await apiRequest('/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ email, codigo })
      });
      if (data.token) {
        setSession(data.token);
      }
      return data;
    },

    async resendCode(email) {
      return await apiRequest('/auth/resend-code', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    async login(email, senha) {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha })
      });
      if (data.token) {
        setSession(data.token);
      }
      return data;
    },

    async getMe() {
      return await apiRequest('/auth/me');
    },

    async logout() {
      try {
        await apiRequest('/auth/logout', { method: 'POST' });
      } catch {
        // Desconsidera erro na chamada se a sessão já estiver encerrada
      }
      clearSession();
    },

    async forgotPassword(email) {
      return await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
    },

    async resetPassword(token, novaSenha) {
      return await apiRequest('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, novaSenha })
      });
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
    },

    // Ação exclusiva de Admin (RBAC): Moderação de qualquer comentário
    async deleteAny(commentId) {
      return await apiRequest(`/comments/admin/${commentId}`, {
        method: 'DELETE'
      });
    }
  },

  admin: {
    async listUsers() {
      return await apiRequest('/auth/users');
    },

    async updateUserRole(userId, papel) {
      return await apiRequest(`/auth/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ papel })
      });
    },

    async listAllComments() {
      return await apiRequest('/comments/admin/all');
    }
  },

  lists: {
    async getAll() {
      return await apiRequest('/lists');
    },

    async getWatchlist() {
      return await apiRequest('/lists/watchlist/items');
    },

    async toggleWatchlist(tmdb_movie_id, titulo, poster_path) {
      return await apiRequest('/lists/watchlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ tmdb_movie_id, titulo, poster_path })
      });
    },

    async create(nome, descricao, filmes = []) {
      return await apiRequest('/lists', {
        method: 'POST',
        body: JSON.stringify({ nome, descricao, filmes })
      });
    },

    async update(listId, nome, descricao, filmes) {
      return await apiRequest(`/lists/${listId}`, {
        method: 'PUT',
        body: JSON.stringify({ nome, descricao, filmes })
      });
    },

    async delete(listId) {
      return await apiRequest(`/lists/${listId}`, {
        method: 'DELETE'
      });
    },

    async getDetails(listId) {
      return await apiRequest(`/lists/${listId}`);
    },

    async addMovie(listId, tmdb_movie_id, titulo, poster_path) {
      return await apiRequest(`/lists/${listId}/items`, {
        method: 'POST',
        body: JSON.stringify({ tmdb_movie_id, titulo, poster_path })
      });
    },

    async removeMovie(listId, tmdbMovieId) {
      return await apiRequest(`/lists/${listId}/items/${tmdbMovieId}`, {
        method: 'DELETE'
      });
    }
  }
};

