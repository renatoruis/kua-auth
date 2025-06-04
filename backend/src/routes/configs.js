const express = require('express');
const router = express.Router();
const configController = require('../controllers/configs');

// Get cluster info - This more specific route must be defined before other routes
router.get('/cluster/info', configController.getClusterInfo);

// Get nodes
router.get('/nodes', configController.getNodes);

// Get namespaces
router.get('/namespaces', configController.getNamespaces);

// Generate kubeconfig for a user - This route with params should come after
router.get('/:namespace/:name', configController.generateKubeconfig);

module.exports = router; 