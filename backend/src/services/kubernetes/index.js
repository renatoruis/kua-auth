const clusterService = require('./cluster');
const usersService = require('./users');
const rolesService = require('./roles');
const { initializeNamespace, DEFAULT_APP_NAMESPACE, RESOURCE_LABEL } = require('./utils');
const { execKubectl, createTempFile, deleteTempFile } = require('./utils');

// Initialize the application
const initialize = async () => {
  console.log('=== Initializing Kubernetes User Admin ===');
  
  try {
    // Criar o namespace padrão
    try {
      const namespaceExistsOutput = await execKubectl(`get namespace ${DEFAULT_APP_NAMESPACE} --no-headers 2>/dev/null || echo "not found"`);
      
      if (namespaceExistsOutput.includes("not found")) {
        console.log(`Namespace ${DEFAULT_APP_NAMESPACE} does not exist. Creating it...`);
        
        const namespaceManifest = {
          apiVersion: 'v1',
          kind: 'Namespace',
          metadata: {
            name: DEFAULT_APP_NAMESPACE,
            labels: RESOURCE_LABEL
          }
        };
        
        const tempFile = createTempFile('namespace', namespaceManifest);
        try {
          await execKubectl(`apply -f ${tempFile}`);
          console.log(`Namespace ${DEFAULT_APP_NAMESPACE} created successfully`);
        } finally {
          deleteTempFile(tempFile);
        }
      } else {
        console.log(`Namespace ${DEFAULT_APP_NAMESPACE} already exists`);
      }
    } catch (error) {
      console.error(`Error checking or creating namespace ${DEFAULT_APP_NAMESPACE}:`, error.message);
      // Não vamos falhar a inicialização por conta do namespace
      // O namespace default sempre existe como fallback
    }
    
    return {
      success: true,
      namespace: DEFAULT_APP_NAMESPACE
    };
  } catch (error) {
    console.error('Error during application initialization:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export all services
module.exports = {
  // Initialization
  initialize,
  DEFAULT_APP_NAMESPACE,
  
  // Cluster information
  getClusterInfo: clusterService.getClusterInfo,
  getNamespaces: clusterService.getNamespaces,
  getNodes: clusterService.getNodes,
  
  // User management (service accounts)
  getServiceAccounts: usersService.getServiceAccounts,
  createServiceAccount: usersService.createServiceAccount,
  deleteServiceAccount: usersService.deleteServiceAccount,
  getServiceAccountToken: usersService.getServiceAccountToken,
  generateKubeconfig: usersService.generateKubeconfig,
  
  // Role management
  getRoles: rolesService.getRoles,
  getClusterRoles: rolesService.getClusterRoles,
  createRole: rolesService.createRole,
  updateRole: rolesService.updateRole,
  deleteRole: rolesService.deleteRole,
  createRoleBinding: rolesService.createRoleBinding,
  updateRoleBinding: rolesService.updateRoleBinding,
  deleteRoleBinding: rolesService.deleteRoleBinding,
  createClusterRole: rolesService.createClusterRole,
  deleteClusterRole: rolesService.deleteClusterRole,
  createClusterRoleBinding: rolesService.createClusterRoleBinding,
  updateClusterRoleBinding: rolesService.updateClusterRoleBinding,
  deleteClusterRoleBinding: rolesService.deleteClusterRoleBinding,
  
  // Multi-namespace role management
  createMultiNamespaceRoleBinding: rolesService.createMultiNamespaceRoleBinding,
  getServiceAccountPermissions: rolesService.getServiceAccountPermissions,
  removeRoleFromServiceAccount: rolesService.removeRoleFromServiceAccount
}; 