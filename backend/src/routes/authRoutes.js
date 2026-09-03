const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.me);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rotas de administração de usuários (RBAC - checagem de papel)
router.get('/users', authController.listUsers);
router.patch('/users/:id/role', authController.updateUserRole);

module.exports = router;

