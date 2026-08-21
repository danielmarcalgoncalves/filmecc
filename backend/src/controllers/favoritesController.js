const { pool } = require('../config/database');

// Lista todos os filmes favoritos do usuário autenticado
async function getFavorites(req, res) {
  try {
    const usuarioId = req.usuarioId;

    const [rows] = await pool.query(
      'SELECT id, usuario_id, tmdb_movie_id, titulo, poster_path, criado_em FROM favoritos WHERE usuario_id = ? ORDER BY criado_em DESC',
      [usuarioId]
    );

    const formatted = rows.map(fav => ({
      ...fav,
      poster_url: fav.poster_path ? `https://image.tmdb.org/t/p/w500${fav.poster_path}` : null
    }));

    return res.json({ favoritos: formatted });
  } catch (error) {
    console.error('[Favorites Controller] Erro ao listar favoritos:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar favoritos.' });
  }
}

// Adiciona um filme aos favoritos do usuário autenticado
async function addFavorite(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { tmdb_movie_id, titulo, poster_path } = req.body;

    if (!tmdb_movie_id || !titulo) {
      return res.status(400).json({ error: 'tmdb_movie_id e titulo são obrigatórios.' });
    }

    // Insere garantindo que não duplicará (UNIQUE KEY usuario_id, tmdb_movie_id)
    await pool.query(
      `INSERT INTO favoritos (usuario_id, tmdb_movie_id, titulo, poster_path)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), poster_path = VALUES(poster_path)`,
      [usuarioId, tmdb_movie_id, titulo, poster_path || null]
    );

    return res.status(201).json({
      message: 'Filme adicionado aos favoritos com sucesso!',
      favorito: {
        usuario_id: usuarioId,
        tmdb_movie_id,
        titulo,
        poster_path,
        poster_url: poster_path ? `https://image.tmdb.org/t/p/w500${poster_path}` : null
      }
    });
  } catch (error) {
    console.error('[Favorites Controller] Erro ao adicionar favorito:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar favorito.' });
  }
}

// Remove um filme dos favoritos do usuário autenticado
async function removeFavorite(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ error: 'ID do filme não fornecido.' });
    }

    const [result] = await pool.query(
      'DELETE FROM favoritos WHERE usuario_id = ? AND tmdb_movie_id = ?',
      [usuarioId, movieId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Favorito não encontrado para este usuário.' });
    }

    return res.json({ message: 'Filme removido dos favoritos com sucesso.' });
  } catch (error) {
    console.error('[Favorites Controller] Erro ao remover favorito:', error);
    return res.status(500).json({ error: 'Erro interno ao remover favorito.' });
  }
}

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite
};
