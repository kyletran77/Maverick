const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.use(authenticateToken); // All routes below require authentication

router.get('/profile', authController.getProfile);
router.put('/profile', authController.updateProfile);
router.get('/verify', authController.verifyToken);

module.exports = router;
