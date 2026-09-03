const { pool } = require('../config/database');

// Lista todos os comentários do usuário autenticado
async function getAllUserComments(req, res) {
  try {
    const usuarioId = req.usuarioId;

    const [rows] = await pool.query(
      `SELECT c.id, c.usuario_id, c.tmdb_movie_id, c.texto, c.criado_em, u.nome AS autor_nome, u.papel AS autor_papel
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.usuario_id = ?
       ORDER BY c.criado_em DESC`,
      [usuarioId]
    );

    return res.json({ comentarios: rows });
  } catch (error) {
    console.error('[Comments Controller] Erro ao listar comentários do usuário:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar comentários.' });
  }
}

// Lista os comentários para um filme específico (visíveis na comunidade)
async function getMovieComments(req, res) {
  try {
    const { movieId } = req.params;

    if (!movieId) {
      return res.status(400).json({ error: 'ID do filme não fornecido.' });
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.usuario_id, c.tmdb_movie_id, c.texto, c.criado_em, u.nome AS autor_nome, u.papel AS autor_papel
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.tmdb_movie_id = ?
       ORDER BY c.criado_em DESC`,
      [movieId]
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
      `SELECT c.id, c.usuario_id, c.tmdb_movie_id, c.texto, c.criado_em, u.nome AS autor_nome, u.papel AS autor_papel
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = ?`,
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

// Remove um comentário pelo ID, garantindo que pertença ao usuário autenticado (ação de usuário comum/premium)
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

    return res.json({ message: 'Comentário próprio removido com sucesso.' });
  } catch (error) {
    console.error('[Comments Controller] Erro ao deletar comentário:', error);
    return res.status(500).json({ error: 'Erro interno ao deletar comentário.' });
  }
}

// AÇÃO EXCLUSIVA DE ADMIN (Moderação RBAC): apaga qualquer comentário do sistema
async function deleteCommentAny(req, res) {
  try {
    const { commentId } = req.params;

    if (!commentId) {
      return res.status(400).json({ error: 'ID do comentário não fornecido.' });
    }

    const [commentRows] = await pool.query(
      `SELECT c.id, c.usuario_id, c.texto, u.nome AS autor_nome, u.email AS autor_email
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    if (commentRows.length === 0) {
      return res.status(404).json({ error: 'Comentário não encontrado no banco de dados.' });
    }

    const [result] = await pool.query(
      'DELETE FROM comentarios WHERE id = ?',
      [commentId]
    );

    return res.json({
      message: 'Comentário moderado e removido com sucesso pela administração (RBAC Admin).',
      comentarioRemovido: commentRows[0]
    });
  } catch (error) {
    console.error('[Comments Controller] Erro ao moderar comentário por admin:', error);
    return res.status(500).json({ error: 'Erro interno ao moderar comentário.' });
  }
}

// AÇÃO EXCLUSIVA DE ADMIN (RBAC): Lista TODOS os comentários de todos os usuários
async function getAllCommentsAdmin(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.usuario_id, c.tmdb_movie_id, c.texto, c.criado_em, 
              u.nome AS autor_nome, u.email AS autor_email, u.papel AS autor_papel
       FROM comentarios c
       JOIN usuarios u ON c.usuario_id = u.id
       ORDER BY c.criado_em DESC`
    );

    return res.json({ comentarios: rows });
  } catch (error) {
    console.error('[Comments Controller] Erro ao listar todos os comentários para admin:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar comentários.' });
  }
}

module.exports = {
  getAllUserComments,
  getMovieComments,
  addComment,
  deleteComment,
  deleteCommentAny,
  getAllCommentsAdmin
};


