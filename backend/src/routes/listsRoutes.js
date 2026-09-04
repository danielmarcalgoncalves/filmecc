const express = require('express');
const router = express.Router();
const listsController = require('../controllers/listsController');
const { authMiddleware } = require('../middlewares/auth');

// Todas as rotas de listas requerem usuário autenticado (isolamento por JWT)
router.use(authMiddleware);

// Listas gerais do usuário e criação
router.get('/', listsController.getUserLists);
router.post('/', listsController.createList);
router.delete('/:listId', listsController.deleteList);

// Watchlist fixa integrada
router.get('/watchlist/items', listsController.getWatchlist);
router.post('/watchlist/toggle', listsController.toggleWatchlist);

// Detalhes e gerenciamento de itens de uma lista específica
router.get('/:listId', listsController.getListDetails);
router.put('/:listId', listsController.updateList);
router.post('/:listId/items', listsController.addMovieToList);
router.delete('/:listId/items/:tmdbMovieId', listsController.removeMovieFromList);

module.exports = router;
