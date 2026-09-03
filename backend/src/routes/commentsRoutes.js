const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const { authMiddleware, requireAdmin } = require('../middlewares/auth');

// Todas as rotas de comentários exigem autenticação
router.use(authMiddleware);

// Rotas comuns (qualquer usuário autenticado)
router.get('/', commentsController.getAllUserComments);
router.get('/movie/:movieId', commentsController.getMovieComments);
router.post('/', commentsController.addComment);
router.delete('/:commentId', commentsController.deleteComment);

// ROTA EXCLUSIVA DE ADMIN (RBAC): Moderação de comentários de qualquer usuário
// Se um usuário com papel diferente de 'admin' chamar, o middleware retorna 403 Forbidden
router.get('/admin/all', requireAdmin, commentsController.getAllCommentsAdmin);
router.delete('/admin/:commentId', requireAdmin, commentsController.deleteCommentAny);

module.exports = router;


