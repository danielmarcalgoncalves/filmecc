const { pool } = require('../config/database');

// Helper para garantir que o usuário tenha sua Watchlist fixa criada
async function getOrCreateWatchlist(usuarioId) {
  const [rows] = await pool.query(
    'SELECT id, usuario_id, nome, descricao, is_watchlist, criado_em FROM listas WHERE usuario_id = ? AND is_watchlist = TRUE',
    [usuarioId]
  );

  if (rows.length > 0) {
    return rows[0];
  }

  const [insertRes] = await pool.query(
    'INSERT INTO listas (usuario_id, nome, descricao, is_watchlist) VALUES (?, ?, ?, TRUE)',
    [usuarioId, 'Watchlist', 'Filmes que pretendo assistir']
  );

  return {
    id: insertRes.insertId,
    usuario_id: usuarioId,
    nome: 'Watchlist',
    descricao: 'Filmes que pretendo assistir',
    is_watchlist: 1,
    criado_em: new Date().toISOString()
  };
}

// Lista todas as listas do usuário com contagem e prévias de pôsteres
async function getUserLists(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';

    // Garante que a Watchlist fixa exista
    await getOrCreateWatchlist(usuarioId);

    // Busca todas as listas do usuário (Watchlist primeiro, depois personalizadas por data)
    const [listas] = await pool.query(
      `SELECT l.id, l.usuario_id, l.nome, l.descricao, l.is_watchlist, l.criado_em,
              COUNT(i.id) AS total_filmes
       FROM listas l
       LEFT JOIN itens_lista i ON l.id = i.lista_id
       WHERE l.usuario_id = ?
       GROUP BY l.id
       ORDER BY l.is_watchlist DESC, l.criado_em DESC`,
      [usuarioId]
    );

    // Para cada lista, busca até 4 pôsteres para exibição em pilha/grid
    const listasComPrevia = await Promise.all(
      listas.map(async (lista) => {
        const [posters] = await pool.query(
          `SELECT tmdb_movie_id, titulo, poster_path
           FROM itens_lista
           WHERE lista_id = ?
           ORDER BY adicionado_em DESC
           LIMIT 4`,
          [lista.id]
        );

        return {
          ...lista,
          is_watchlist: Boolean(lista.is_watchlist),
          total_filmes: Number(lista.total_filmes || 0),
          posters: posters.map(p => ({
            ...p,
            poster_url: p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : null
          }))
        };
      })
    );

    // Limites de cotas para exibir no frontend
    const limiteListas = papelUsuario === 'usuario' ? 2 : 10;
    const limiteWatchlist = papelUsuario === 'usuario' ? 10 : 9999;
    const totalListasPersonalizadas = listasComPrevia.filter(l => !l.is_watchlist).length;

    return res.json({
      listas: listasComPrevia,
      cotas: {
        papel: papelUsuario,
        listasCriadas: totalListasPersonalizadas,
        limiteListas,
        limiteWatchlist
      }
    });
  } catch (error) {
    console.error('[Lists Controller] Erro ao listar listas:', error);
    return res.status(500).json({ error: 'Erro interno ao buscar listas.' });
  }
}

// Retorna detalhes de uma lista específica e todos os filmes dela
async function getListDetails(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { listId } = req.params;

    const [listas] = await pool.query(
      'SELECT id, usuario_id, nome, descricao, is_watchlist, criado_em FROM listas WHERE id = ? AND usuario_id = ?',
      [listId, usuarioId]
    );

    if (listas.length === 0) {
      return res.status(404).json({ error: 'Lista não encontrada ou não pertence a este usuário.' });
    }

    const lista = listas[0];

    const [itens] = await pool.query(
      `SELECT id, tmdb_movie_id, titulo, poster_path, adicionado_em
       FROM itens_lista
       WHERE lista_id = ?
       ORDER BY adicionado_em DESC`,
      [listId]
    );

    const formatados = itens.map(item => ({
      ...item,
      poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null
    }));

    return res.json({
      lista: {
        ...lista,
        is_watchlist: Boolean(lista.is_watchlist),
        total_filmes: formatados.length,
        filmes: formatados
      }
    });
  } catch (error) {
    console.error('[Lists Controller] Erro ao buscar detalhes da lista:', error);
    return res.status(500).json({ error: 'Erro interno ao carregar a lista.' });
  }
}

// Retorna apenas a Watchlist fixa com todos os filmes
async function getWatchlist(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';

    const watchlist = await getOrCreateWatchlist(usuarioId);

    const [itens] = await pool.query(
      `SELECT id, tmdb_movie_id, titulo, poster_path, adicionado_em
       FROM itens_lista
       WHERE lista_id = ?
       ORDER BY adicionado_em DESC`,
      [watchlist.id]
    );

    const formatados = itens.map(item => ({
      ...item,
      poster_url: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null
    }));

    return res.json({
      watchlist: {
        ...watchlist,
        is_watchlist: true,
        total_filmes: formatados.length,
        limite: papelUsuario === 'usuario' ? 10 : 9999,
        filmes: formatados
      }
    });
  } catch (error) {
    console.error('[Lists Controller] Erro ao buscar Watchlist:', error);
    return res.status(500).json({ error: 'Erro ao buscar Watchlist.' });
  }
}

// Alterna (adiciona ou remove) um filme da Watchlist com validação de cota
async function toggleWatchlist(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const { tmdb_movie_id, titulo, poster_path } = req.body;

    if (!tmdb_movie_id || !titulo) {
      return res.status(400).json({ error: 'tmdb_movie_id e titulo são obrigatórios.' });
    }

    const watchlist = await getOrCreateWatchlist(usuarioId);

    // Verifica se já está na Watchlist
    const [existentes] = await pool.query(
      'SELECT id FROM itens_lista WHERE lista_id = ? AND tmdb_movie_id = ?',
      [watchlist.id, tmdb_movie_id]
    );

    if (existentes.length > 0) {
      // Remove da Watchlist
      await pool.query(
        'DELETE FROM itens_lista WHERE lista_id = ? AND tmdb_movie_id = ?',
        [watchlist.id, tmdb_movie_id]
      );

      return res.json({
        inWatchlist: false,
        message: `"${titulo}" removido da sua Watchlist.`
      });
    }

    // Se não está, valida limite de cota antes de adicionar
    if (papelUsuario === 'usuario') {
      const [countRows] = await pool.query(
        'SELECT COUNT(*) as total FROM itens_lista WHERE lista_id = ?',
        [watchlist.id]
      );
      const totalAtual = countRows[0].total;

      if (totalAtual >= 10) {
        return res.status(403).json({
          error: 'Limite de 10 filmes na Watchlist atingido para o plano Comum. Faça upgrade para o Premium para salvar filmes ilimitados!',
          limite: 10,
          papelAtual: papelUsuario
        });
      }
    }

    // Insere na Watchlist
    await pool.query(
      'INSERT INTO itens_lista (lista_id, tmdb_movie_id, titulo, poster_path) VALUES (?, ?, ?, ?)',
      [watchlist.id, tmdb_movie_id, titulo, poster_path || null]
    );

    return res.status(201).json({
      inWatchlist: true,
      message: `"${titulo}" adicionado à sua Watchlist!`
    });
  } catch (error) {
    console.error('[Lists Controller] Erro ao alternar Watchlist:', error);
    return res.status(500).json({ error: 'Erro interno ao atualizar Watchlist.' });
  }
}

// Cria uma nova lista personalizada com validação de cota
async function createList(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const { nome, descricao } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ error: 'Por favor, informe um título para a lista.' });
    }

    // Regra de Cotas para Listas Personalizadas
    // Comum: máx 2 listas | Premium: máx 10 listas | Admin: 50
    const limiteListas = papelUsuario === 'admin' ? 50 : papelUsuario === 'premium' ? 10 : 2;

    const [countRows] = await pool.query(
      'SELECT COUNT(*) as total FROM listas WHERE usuario_id = ? AND is_watchlist = FALSE',
      [usuarioId]
    );
    const totalCriadas = countRows[0].total;

    if (totalCriadas >= limiteListas) {
      return res.status(403).json({
        error: `Você atingiu o limite de ${limiteListas} listas personalizadas para o seu plano (${papelUsuario === 'usuario' ? 'Comum' : 'Premium'}). Faça upgrade para criar mais listas!`,
        limite: limiteListas,
        papelAtual: papelUsuario
      });
    }

    const [result] = await pool.query(
      'INSERT INTO listas (usuario_id, nome, descricao, is_watchlist) VALUES (?, ?, ?, FALSE)',
      [usuarioId, nome.trim(), descricao ? descricao.trim() : null]
    );

    const [novaLista] = await pool.query(
      'SELECT id, usuario_id, nome, descricao, is_watchlist, criado_em FROM listas WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      message: 'Lista criada com sucesso!',
      lista: {
        ...novaLista[0],
        is_watchlist: false,
        total_filmes: 0,
        posters: []
      }
    });
  } catch (error) {
    console.error('[Lists Controller] Erro ao criar lista:', error);
    return res.status(500).json({ error: 'Erro interno ao criar lista.' });
  }
}

// Exclui uma lista personalizada própria (não permite apagar a Watchlist)
async function deleteList(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { listId } = req.params;

    const [listas] = await pool.query(
      'SELECT id, is_watchlist FROM listas WHERE id = ? AND usuario_id = ?',
      [listId, usuarioId]
    );

    if (listas.length === 0) {
      return res.status(404).json({ error: 'Lista não encontrada ou não pertence a você.' });
    }

    if (listas[0].is_watchlist) {
      return res.status(400).json({ error: 'A Watchlist padrão do sistema não pode ser excluída.' });
    }

    await pool.query('DELETE FROM listas WHERE id = ?', [listId]);

    return res.json({ message: 'Lista excluída com sucesso.' });
  } catch (error) {
    console.error('[Lists Controller] Erro ao excluir lista:', error);
    return res.status(500).json({ error: 'Erro interno ao excluir lista.' });
  }
}

// Adiciona um filme a uma lista personalizada
async function addMovieToList(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const papelUsuario = req.usuarioPapel || 'usuario';
    const { listId } = req.params;
    const { tmdb_movie_id, titulo, poster_path } = req.body;

    if (!tmdb_movie_id || !titulo) {
      return res.status(400).json({ error: 'tmdb_movie_id e titulo são obrigatórios.' });
    }

    // Valida se a lista pertence ao usuário
    const [listas] = await pool.query(
      'SELECT id, is_watchlist FROM listas WHERE id = ? AND usuario_id = ?',
      [listId, usuarioId]
    );

    if (listas.length === 0) {
      return res.status(404).json({ error: 'Lista não encontrada ou não pertence a você.' });
    }

    // Cota de filmes por lista personalizada (Comum: 20 filmes | Premium: ilimitado)
    if (papelUsuario === 'usuario') {
      const [countRows] = await pool.query(
        'SELECT COUNT(*) as total FROM itens_lista WHERE lista_id = ?',
        [listId]
      );
      if (countRows[0].total >= 20) {
        return res.status(403).json({
          error: 'Limite de 20 filmes por lista atingido para o plano Comum. Faça upgrade para o Premium para listas ilimitadas!',
          limite: 20,
          papelAtual: papelUsuario
        });
      }
    }

    // Verifica se já está na lista
    const [existentes] = await pool.query(
      'SELECT id FROM itens_lista WHERE lista_id = ? AND tmdb_movie_id = ?',
      [listId, tmdb_movie_id]
    );

    if (existentes.length > 0) {
      return res.status(400).json({ error: 'Este filme já foi adicionado a esta lista.' });
    }

    await pool.query(
      'INSERT INTO itens_lista (lista_id, tmdb_movie_id, titulo, poster_path) VALUES (?, ?, ?, ?)',
      [listId, tmdb_movie_id, titulo, poster_path || null]
    );

    return res.status(201).json({ message: `"${titulo}" adicionado à lista!` });
  } catch (error) {
    console.error('[Lists Controller] Erro ao adicionar filme à lista:', error);
    return res.status(500).json({ error: 'Erro interno ao adicionar filme à lista.' });
  }
}

// Remove um filme de uma lista
async function removeMovieFromList(req, res) {
  try {
    const usuarioId = req.usuarioId;
    const { listId, tmdbMovieId } = req.params;

    // Valida se a lista pertence ao usuário
    const [listas] = await pool.query(
      'SELECT id FROM listas WHERE id = ? AND usuario_id = ?',
      [listId, usuarioId]
    );

    if (listas.length === 0) {
      return res.status(404).json({ error: 'Lista não encontrada ou não pertence a você.' });
    }

    const [result] = await pool.query(
      'DELETE FROM itens_lista WHERE lista_id = ? AND tmdb_movie_id = ?',
      [listId, tmdbMovieId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Filme não encontrado nesta lista.' });
    }

    return res.json({ message: 'Filme removido da lista.' });
  } catch (error) {
    console.error('[Lists Controller] Erro ao remover filme da lista:', error);
    return res.status(500).json({ error: 'Erro interno ao remover filme da lista.' });
  }
}

module.exports = {
  getUserLists,
  getListDetails,
  getWatchlist,
  toggleWatchlist,
  createList,
  deleteList,
  addMovieToList,
  removeMovieFromList
};
