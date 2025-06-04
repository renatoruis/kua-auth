const express = require('express');
const router = express.Router();
const userController = require('../controllers/users');

// Get all users
router.get('/', userController.getAllUsers);

// Get a specific user
router.get('/:namespace/:name', userController.getUser);

// Create a user
router.post('/', userController.createUser);

// Delete a user
router.delete('/:namespace/:name', userController.deleteUser);

// Generate kubeconfig for a user
router.get('/:namespace/:name/kubeconfig', userController.generateUserKubeconfig);

module.exports = router; 