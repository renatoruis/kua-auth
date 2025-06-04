const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roles');

// --- RBAC Listing --- 
// Get all managed Roles (namespaced) and ClusterRoles (cluster-wide)
router.get('/', roleController.getAllRolesAndClusterRoles);

// Get all RoleBindings and ClusterRoleBindings
router.get('/bindings', roleController.getAllRoleBindingsAndClusterRoleBindings);

// --- Service Account Permissions ---
// Get role bindings for a specific service account
router.get('/bindings/:namespace/:name', roleController.getRoleBindingsForServiceAccount);

// --- Roles (Namespaced) --- 
// Get managed Roles for a specific namespace
router.get('/namespace/:namespace', roleController.getNamespaceRoles);

// Create a new Role in a namespace
router.post('/namespace/:namespace/role', roleController.createRole);

// Update an existing Role in a namespace
router.put('/namespace/:namespace/role/:name', roleController.updateRole);

// Delete a Role from a namespace
router.delete('/namespace/:namespace/role/:name', roleController.deleteRole);

// --- ClusterRoles --- 
// Create a new ClusterRole
router.post('/clusterrole', roleController.createOrUpdateClusterRole); // Uses same controller for create

// Update an existing ClusterRole
router.put('/clusterrole/:name', roleController.createOrUpdateClusterRole); // Uses same controller for update

// Delete a ClusterRole
router.delete('/clusterrole/:name', roleController.deleteClusterRole);

// --- RoleBindings (Namespaced) --- 
// Create a new RoleBinding in a namespace
router.post('/namespace/:namespace/rolebinding', roleController.createRoleBinding);

// Update an existing RoleBinding in a namespace
router.put('/namespace/:namespace/rolebinding/:name', roleController.updateRoleBinding);

// Delete a RoleBinding from a namespace
router.delete('/namespace/:namespace/rolebinding/:name', roleController.deleteRoleBinding);

// --- ClusterRoleBindings --- 
// Create a new ClusterRoleBinding
router.post('/clusterrolebinding', roleController.createClusterRoleBinding);

// Update an existing ClusterRoleBinding
router.put('/clusterrolebinding/:name', roleController.updateClusterRoleBinding);

// Delete a ClusterRoleBinding
router.delete('/clusterrolebinding/:name', roleController.deleteClusterRoleBinding);

// --- Permission Templates --- 
// Get predefined permission templates
router.get('/templates', roleController.getPermissionTemplates);

// Multi-namespace role management routes
router.post('/serviceaccount/add-role', roleController.addRoleToServiceAccountMultiNamespace);
router.get('/serviceaccount/:serviceAccountNamespace/:serviceAccountName/permissions', roleController.getServiceAccountPermissions);
router.delete('/serviceaccount/:serviceAccountNamespace/:serviceAccountName/role/:roleName', roleController.removeRoleFromServiceAccount);

module.exports = router; 