const express = require('express');
const router = express.Router();
const moviesController = require('../controllers/moviesController');
const { authMiddleware } = require('../middlewares/auth');

// Busca dos filmes do Tom Hanks na API externa TMDB
// Requer autenticação para acesso ao catálogo
router.get('/tom-hanks', authMiddleware, moviesController.getTomHanksMovies);

module.exports = router;
