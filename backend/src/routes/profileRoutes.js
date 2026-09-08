/**
 * profileRoutes.js
 * Rotas de perfil de usuario — protegidas por authMiddleware (JWT + DB).
 *
 * POST /api/profile/avatar usa multer com storage em memoria (memoryStorage):
 *   - Arquivo nunca toca o disco do servidor; vai direto do buffer para o MinIO
 *   - Limite de 10 MB no nivel do multer (a validacao real de 5 MB fica no controller)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authMiddleware } = require('../middlewares/auth');
const { getProfile, updateProfile, uploadAvatar } = require('../controllers/profileController');

// Multer: guarda o arquivo na memoria (Buffer) sem gravar no disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB (validacao de 5 MB no controller)
});

// GET  /api/profile        — retorna dados do perfil do usuario logado
router.get('/', authMiddleware, getProfile);

// PUT  /api/profile        — atualiza nome e/ou bio
router.put('/', authMiddleware, updateProfile);

// POST /api/profile/avatar — upload de foto (campo multipart: "avatar")
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);

module.exports = router;
