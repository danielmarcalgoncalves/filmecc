const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware, requireAdmin } = require('../middlewares/auth');
const {
  registerLimiter,
  loginLimiter,
  verifyCodeLimiter,
  forgotPasswordLimiter,
  validateRegistrationInput
} = require('../middlewares/security');

// Autenticação com proteção Anti-Brute Force e Anti-Bot (OWASP ZAP)
router.post('/register', registerLimiter, validateRegistrationInput, authController.register);
router.post('/verify-code', verifyCodeLimiter, authController.verifyCode);
router.post('/resend-code', verifyCodeLimiter, authController.resendCode);
router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.post('/reset-password', forgotPasswordLimiter, authController.resetPassword);

// Rotas de administração de usuários (RBAC - proteção estrita de nível Admin)
router.get('/users', authMiddleware, requireAdmin, authController.listUsers);
router.patch('/users/:id/role', authMiddleware, requireAdmin, authController.updateUserRole);

module.exports = router;
