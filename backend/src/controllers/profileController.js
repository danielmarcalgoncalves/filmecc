/**
 * profileController.js
 * Gerencia o perfil do usuario autenticado.
 *
 * Seguranca Anti-IDOR:
 *   Todas as rotas usam req.usuarioId (injetado pelo authMiddleware a partir do JWT
 *   validado no banco), nunca um ID enviado pelo cliente no corpo/params da requisicao.
 *   Isso garante que um usuario so pode ler/editar o proprio perfil.
 *
 * Rotas:
 *   GET  /api/profile        -> getProfile()     - retorna dados do usuario logado
 *   PUT  /api/profile        -> updateProfile()  - atualiza nome e bio
 *   POST /api/profile/avatar -> uploadAvatar()   - faz upload da foto para o MinIO
 */

const { pool } = require('../config/database');
const { uploadFile, getFileStream, deleteFile } = require('../services/minioClient');
const { sendLog } = require('../services/logClient');

/**
 * GET /api/profile
 * Retorna todos os dados do usuario logado (incluindo foto_url e bio se existirem).
 */
async function getProfile(req, res) {
  try {
    const [rows] = await pool.query(
      'SELECT id, nome, email, papel, foto_url, bio, criado_em FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado.' });
    }
    return res.json({ usuario: rows[0] });
  } catch (err) {
    console.error('[profileController] getProfile error:', err.message);
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
}

/**
 * PUT /api/profile
 * Atualiza nome e/ou bio do usuario logado.
 * Body esperado: { nome?: string, bio?: string }
 */
async function updateProfile(req, res) {
  try {
    // 🛡️ Defesa Anti-IDOR (Insecure Direct Object Reference):
    // 1. Bloqueia se tentar passar outro ID via parâmetro de rota (ex: PUT /api/profile/99)
    const targetParamId = req.params.id ? Number(req.params.id) : null;
    if (targetParamId && targetParamId !== req.usuarioId) {
      sendLog('BLOQUEIO_IDOR_403', req, {
        motivo: 'Tentativa de alteração não autorizada de perfil de outro usuário via URL',
        usuarioAutenticado: req.usuarioId,
        usuarioAlvo: targetParamId
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden - Anti-IDOR). Você não possui permissão para editar o perfil de outro usuário.',
        codigo: 'IDOR_BLOCK',
        usuarioAutenticado: req.usuarioId,
        tentativaId: targetParamId
      });
    }

    // 2. Bloqueia se tentar forjar usuario_id ou id no corpo JSON da requisição
    const targetBodyId = req.body.usuario_id || req.body.id;
    if (targetBodyId && Number(targetBodyId) !== req.usuarioId) {
      sendLog('BLOQUEIO_IDOR_403', req, {
        motivo: 'Tentativa de alteração não autorizada de perfil de outro usuário via corpo JSON',
        usuarioAutenticado: req.usuarioId,
        usuarioAlvo: Number(targetBodyId)
      });
      return res.status(403).json({
        error: 'Acesso negado (403 Forbidden - Anti-IDOR). Você não possui permissão para alterar o perfil de outro usuário.',
        codigo: 'IDOR_BLOCK',
        usuarioAutenticado: req.usuarioId,
        tentativaId: Number(targetBodyId)
      });
    }

    const { nome, bio } = req.body;

    if (!nome && bio === undefined) {
      return res.status(400).json({ error: 'Nenhum campo enviado para atualizar.' });
    }

    const fields = [];
    const values = [];

    if (nome) {
      if (typeof nome !== 'string' || nome.trim().length < 2) {
        return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' });
      }
      fields.push('nome = ?');
      values.push(nome.trim().slice(0, 100));
    }

    if (bio !== undefined) {
      fields.push('bio = ?');
      values.push(bio ? bio.trim().slice(0, 500) : null);
    }

    values.push(req.usuarioId);
    await pool.query('UPDATE usuarios SET ' + fields.join(', ') + ' WHERE id = ?', values);

    const [rows] = await pool.query(
      'SELECT id, nome, email, papel, foto_url, bio FROM usuarios WHERE id = ?',
      [req.usuarioId]
    );

    sendLog('PERFIL_ATUALIZADO', req, { usuario_id: req.usuarioId });
    return res.json({ message: 'Perfil atualizado com sucesso.', usuario: rows[0] });
  } catch (err) {
    console.error('[profileController] updateProfile error:', err.message);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
}

/**
 * POST /api/profile/avatar
 * Recebe a imagem via multipart/form-data (campo: "avatar"),
 * faz upload para o MinIO e salva a URL no banco.
 *
 * O middleware multer (configurado na rota) ja fez o parse e colocou
 * o arquivo em req.file com os campos: buffer, originalname, mimetype, size.
 */
async function uploadAvatar(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado. Use o campo "avatar".' });
    }

    const { buffer, originalname, mimetype, size } = req.file;

    // Limite de 5 MB
    if (size > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imagem muito grande. Limite de 5 MB.' });
    }

    // Aceita apenas JPEG, PNG e WebP
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(mimetype)) {
      return res.status(400).json({ error: 'Formato invalido. Use JPEG, PNG ou WebP.' });
    }

    // Remove a foto antiga do MinIO (se existir) para nao acumular arquivos orfaos
    const [rows] = await pool.query('SELECT foto_url FROM usuarios WHERE id = ?', [req.usuarioId]);
    const urlAntiga = rows[0]?.foto_url;
    if (urlAntiga) {
      const match = urlAntiga.match(/usuario-\d+-\d+\.[a-zA-Z0-9]+/);
      if (match) {
        await deleteFile('avatar/' + match[0]);
      }
    }

    // Faz upload da nova foto
    const { url } = await uploadFile(buffer, originalname, mimetype, req.usuarioId);

    // Salva a URL no banco
    await pool.query('UPDATE usuarios SET foto_url = ? WHERE id = ?', [url, req.usuarioId]);

    sendLog('AVATAR_ATUALIZADO', req, { usuario_id: req.usuarioId, foto_url: url });

    return res.json({
      message: 'Foto de perfil atualizada com sucesso.',
      foto_url: url
    });
  } catch (err) {
    console.error('[profileController] uploadAvatar error:', err.message);
    return res.status(500).json({ error: 'Erro ao fazer upload da imagem: ' + err.message });
  }
}

/**
 * GET /api/profile/avatar/:filename
 * Serve a imagem diretamente do MinIO via streaming.
 * Público para permitir exibição em tags <img> no navegador.
 */
async function getAvatar(req, res) {
  try {
    const filename = req.params.filename;
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).send('Nome de arquivo invalido.');
    }

    const objectName = 'avatar/' + filename;
    const stream = await getFileStream(objectName);

    if (filename.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    } else if (filename.endsWith('.webp')) {
      res.setHeader('Content-Type', 'image/webp');
    } else {
      res.setHeader('Content-Type', 'image/jpeg');
    }

    res.setHeader('Cache-Control', 'public, max-age=86400');
    stream.pipe(res);
  } catch (err) {
    return res.status(404).send('Foto de perfil nao encontrada.');
  }
}

module.exports = { getProfile, updateProfile, uploadAvatar, getAvatar };
