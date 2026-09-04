const express = require('express');
const router = express.Router();
const moviesController = require('../controllers/moviesController');
const { authMiddleware } = require('../middlewares/auth');

// Busca dos filmes do Tom Hanks na API externa TMDB
// Rota pública para permitir a visualização de degustação no modo visitante e catálogo completo
router.get('/tom-hanks', moviesController.getTomHanksMovies);

module.exports = router;
