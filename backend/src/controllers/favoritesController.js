const { pool } = require('../config/database');
const { sendLog } = require('../services/logClient');

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

    const papelUsuario = req.usuarioPapel || 'usuario';

    // Regra RBAC para limite de favoritos:
    // - Usuário Comum: limite máximo de 5 favoritos
    // - Usuário Premium: limite máximo de 20 favoritos
    // - Admin: ilimitado
    let limite = null;
    if (papelUsuario === 'usuario') {
      limite = 5;
    } else if (papelUsuario === 'premium') {
      limite = 20;
    }

    if (limite !== null) {
      const [favCountRows] = await pool.query(
        'SELECT COUNT(*) as total FROM favoritos WHERE usuario_id = ?',
        [usuarioId]
      );
      const totalFavoritos = favCountRows[0].total;

      // Se já possui o limite e está tentando adicionar um novo filme que ainda não está favoritado
      const [alreadyFav] = await pool.query(
        'SELECT id FROM favoritos WHERE usuario_id = ? AND tmdb_movie_id = ?',
        [usuarioId, tmdb_movie_id]
      );

      if (totalFavoritos >= limite && alreadyFav.length === 0) {
        const nomePlano = papelUsuario === 'usuario' ? 'Usuário Comum' : 'Usuário Premium';
        sendLog('BLOQUEIO_LIMITE_FAVORITOS_403', req, {
          motivo: `Limite de ${limite} favoritos atingido para ${nomePlano}`,
          tmdb_movie_id,
          titulo,
          papelAtual: papelUsuario,
          limite
        });
        return res.status(403).json({
          error: `Limite de ${limite} filmes favoritos atingido para o plano ${nomePlano}.`,
          isLimitReached: true,
          papelAtual: papelUsuario,
          limite
        });
      }
    }

    // Insere garantindo que não duplicará (UNIQUE KEY usuario_id, tmdb_movie_id)
    await pool.query(
      `INSERT INTO favoritos (usuario_id, tmdb_movie_id, titulo, poster_path)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE titulo = VALUES(titulo), poster_path = VALUES(poster_path)`,
      [usuarioId, tmdb_movie_id, titulo, poster_path || null]
    );

    sendLog('FAVORITAR_FILME', req, {
      tmdb_movie_id,
      titulo,
      papel: papelUsuario
    });

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

    sendLog('DESFAVORITAR_FILME', req, {
      tmdb_movie_id: movieId
    });

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
