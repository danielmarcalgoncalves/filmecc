const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const authMiddleware = require('../middlewares/auth');

// Todas as rotas de comentários exigem autenticação e aplicam isolamento por usuario_id
router.use(authMiddleware);

router.get('/', commentsController.getAllUserComments);
router.get('/movie/:movieId', commentsController.getMovieComments);
router.post('/', commentsController.addComment);
router.delete('/:commentId', commentsController.deleteComment);

module.exports = router;
