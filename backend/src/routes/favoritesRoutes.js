const express = require('express');
const router = express.Router();
const favoritesController = require('../controllers/favoritesController');
const { authMiddleware } = require('../middlewares/auth');

// Todas as rotas de favoritos exigem autenticação e aplicam isolamento por usuario_id
router.use(authMiddleware);

router.get('/', favoritesController.getFavorites);
router.post('/', favoritesController.addFavorite);
router.delete('/:movieId', favoritesController.removeFavorite);

module.exports = router;
