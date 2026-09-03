const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, requireAdmin } = require('../middlewares/auth');

router.post('/register', authController.register);
router.post('/verify-code', authController.verifyCode);
router.post('/resend-code', authController.resendCode);
router.post('/login', authController.login);
router.get('/me', authController.me);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Rotas de administração de usuários (RBAC - proteção estrita de nível Admin)
router.get('/users', authMiddleware, requireAdmin, authController.listUsers);
router.patch('/users/:id/role', authMiddleware, requireAdmin, authController.updateUserRole);

module.exports = router;

