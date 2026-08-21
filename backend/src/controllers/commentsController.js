const { pool } = require('../config/database');

// Lista todos os comentários do usuário autenticado
async function getAllUserComments(req, res) {
  try {
    const usuarioId = req.usuarioId;

    const [rows] = await pool.query(
      `SELECT id, usuario_id, tmdb_movie_id, texto, criado_em
       FROM comentarios
       WHERE usuario_id = ?
       ORDER BY criado_em DESC`,
      [usuarioId]
    );

    return res.json({ comentarios: rows });
  } catch (error) {
    console.error('[Comments Controller] Erro ao listar comentários do usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar comentários.' });
  }
}

// Lista os comentários do usuário autenticado para um filme específico
async function getMovieComments(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ error: 'ID do filme não fornecido.' });
    }

    const [rows] = await pool.query(
      `SELECT id, usuario_id, tmdb_movie_id, texto, criado_em
       FROM comentarios
       WHERE usuario_id = ? AND tmdb_movie_id = ?
       ORDER BY criado_em DESC`,
      [usuarioId, movieId]
    );

    return res.json({ comentarios: rows });
  } catch (error) {
    console.error('[Comments Controller] Erro ao listar comentários do filme:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar comentários do filme.' });
  }
}

// Adiciona um novo comentário do usuário autenticado para um filme
async function addComment(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { tmdb_movie_id, texto } = req.body;

    if (!tmdb_movie_id || !texto || !texto.trim()) {
      return res.status(400).json({ error: 'tmdb_movie_id e texto do comentário são obrigatórios.' });
    }

    const [result] = await pool.query(
      'INSERT INTO comentarios (usuario_id, tmdb_movie_id, texto) VALUES (?, ?, ?)',
      [usuarioId, tmdb_movie_id, texto.trim()]
    );

    const [newComment] = await pool.query(
      'SELECT id, usuario_id, tmdb_movie_id, texto, criado_em FROM comentarios WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Comentário publicado com sucesso!',
      comentario: newComment[0]
    });
  } catch (error) {
    console.error('[Comments Controller] Erro ao adicionar comentário:', error);
    return res.status(500).json({ error: 'Erro interno ao salvar comentário.' });
  }
}

// Remove um comentário pelo ID, garantindo que pertença ao usuário autenticado
async function deleteComment(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ error: 'ID do comentário não fornecido.' });
    }

    const [result] = await pool.query(
      'DELETE FROM comentarios WHERE id = ? AND usuario_id = ?',
      [commentId, usuarioId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado ou não pertence a este usuário.' });
    }

    return res.json({ message: 'Comentário removido com sucesso.' });
  } catch (error) {
    console.error('[Comments Controller] Erro ao deletar comentário:', error);
    return res.status(500).json({ error: 'Erro interno ao deletar comentário.' });
  }
}

module.exports = {
  getAllUserComments,
  getMovieComments,
  addComment,
  deleteComment
};
