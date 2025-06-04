const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Authenticate admin user and get token
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route GET /api/auth/verify
 * @desc Verify JWT token
 * @access Public
 */
router.get('/verify', authController.verifyToken);

module.exports = router; 