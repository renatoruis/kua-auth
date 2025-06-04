const k8sService = require('../services/kubernetes');
const { execKubectl } = require('../services/kubernetes/utils');

// Helper function to set cache control headers
const setCacheControlHeaders = (res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Expires': '-1',
    'Pragma': 'no-cache'
  });
};

// --- Roles (Namespaced) --- 

// Get all roles (namespaced and cluster-wide managed by the app)
const getAllRolesAndClusterRoles = async (req, res) => {
  try {
    const roles = await k8sService.getRoles(); // Gets roles from all namespaces managed by app
    const clusterRoles = await k8sService.getClusterRoles(); // Gets cluster roles managed by app
    
    setCacheControlHeaders(res);
    res.status(200).json({ roles, clusterRoles });
  } catch (error) {
    console.error('Error getting all roles and cluster roles:', error);
    res.status(500).json({ message: 'Failed to get roles and cluster roles', error: error.message });
  }
};

// Get roles for a specific namespace (managed by the app)
const getNamespaceRoles = async (req, res) => {
  const { namespace } = req.params;
  try {
    const roles = await k8sService.getRoles(namespace);
    setCacheControlHeaders(res);
    res.status(200).json(roles);
  } catch (error) {
    console.error(`Error getting roles for namespace ${namespace}:`, error);
    res.status(500).json({ message: `Failed to get roles for namespace ${namespace}`, error: error.message });
  }
};

// Create a Role
const createRole = async (req, res) => {
  const { namespace } = req.params;
  const { name, rules } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Role name is required' });
  }
  
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return res.status(400).json({ message: 'At least one valid rule is required' });
  }
  
  try {
    const role = await k8sService.createRole(name, namespace, rules);
    
    res.status(201).json({
      message: `Role '${name}' created successfully in namespace '${namespace}'`,
      role
    });
  } catch (error) {
    console.error(`Error creating role ${name}:`, error);
    let statusCode = 500;
    if (error.message && error.message.includes('already exists')) {
      statusCode = 409; // Conflict
    }
    res.status(statusCode).json({ message: `Failed to create role ${name}`, error: error.message });
  }
};

// Update a Role
const updateRole = async (req, res) => {
  const { name, namespace } = req.params;
  const { rules } = req.body;
  if (!rules) {
    return res.status(400).json({ message: 'Rules are required for updating a role' });
  }
  try {
    const updatedRole = await k8sService.updateRole(name, namespace, rules);
    res.status(200).json(updatedRole);
  } catch (error) {
    console.error(`Error updating role ${name} in ${namespace}:`, error);
    res.status(500).json({ message: `Failed to update role ${name}`, error: error.message });
  }
};

// Delete a Role
const deleteRole = async (req, res) => {
  const { name, namespace } = req.params;
  try {
    const result = await k8sService.deleteRole(name, namespace);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error deleting role ${name} in ${namespace}:`, error);
    res.status(500).json({ message: `Failed to delete role ${name}`, error: error.message });
  }
};

// --- ClusterRoles --- 

// Create or Update a ClusterRole
const createOrUpdateClusterRole = async (req, res) => {
  const { name } = req.params; // Name from path for update, or from body for create
  const { rules, name: bodyName } = req.body;
  const clusterRoleName = name || bodyName;

  if (!clusterRoleName || !rules) {
    return res.status(400).json({ message: 'ClusterRole name and rules are required' });
  }
  try {
    const clusterRole = await k8sService.createClusterRole(clusterRoleName, rules);
    res.status(name ? 200 : 201).json(clusterRole); // 200 for update, 201 for create
  } catch (error) {
    console.error(`Error creating/updating cluster role ${clusterRoleName}:`, error);
    res.status(500).json({ message: `Failed to create/update cluster role ${clusterRoleName}`, error: error.message });
  }
};

// Delete a ClusterRole
const deleteClusterRole = async (req, res) => {
  const { name } = req.params;
  try {
    const result = await k8sService.deleteClusterRole(name);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error deleting cluster role ${name}:`, error);
    res.status(500).json({ message: `Failed to delete cluster role ${name}`, error: error.message });
  }
};

// --- RoleBindings (Namespaced) ---

// Create a RoleBinding
const createRoleBinding = async (req, res) => {
  const { namespace } = req.params;
  const { name, roleName, serviceAccountName, serviceAccountNamespace, roleKind } = req.body;
  
  if (!name || !roleName || !serviceAccountName) {
    return res.status(400).json({ message: 'Name, roleName, and serviceAccountName are required' });
  }
  
  try {
    const roleBinding = await k8sService.createRoleBinding(
      name, 
      namespace, 
      roleName, 
      serviceAccountName, 
      serviceAccountNamespace || namespace,
      roleKind || 'Role'  // Default to 'Role' if not specified
    );
    
    res.status(201).json({
      message: `RoleBinding '${name}' created successfully in namespace '${namespace}'`,
      roleBinding
    });
  } catch (error) {
    console.error(`Error creating role binding ${name}:`, error);
    let statusCode = 500;
    if (error.message && error.message.includes('already exists')) {
      statusCode = 409; // Conflict
    } else if (error.message && error.message.includes('not found')) {
      statusCode = 404; // Not Found
    }
    res.status(statusCode).json({ message: `Failed to create role binding ${name}`, error: error.message });
  }
};

// Update a RoleBinding
const updateRoleBinding = async (req, res) => {
  const { name, namespace } = req.params;
  const { roleName, serviceAccountName, serviceAccountNamespace, roleKind } = req.body;
  if (!roleName || !serviceAccountName ) { // serviceAccountNamespace can default
    return res.status(400).json({ message: 'roleName and serviceAccountName are required for update' });
  }
  try {
    const updatedBinding = await k8sService.updateRoleBinding(
      name, 
      namespace, 
      roleName, 
      serviceAccountName, 
      serviceAccountNamespace || namespace,
      roleKind || 'Role'  // Default to 'Role' if not specified
    );
    res.status(200).json(updatedBinding);
  } catch (error) {
    console.error(`Error updating role binding ${name} in ${namespace}:`, error);
    res.status(500).json({ message: `Failed to update role binding ${name}`, error: error.message });
  }
};

// Delete a RoleBinding
const deleteRoleBinding = async (req, res) => {
  const { name, namespace } = req.params;
  try {
    const result = await k8sService.deleteRoleBinding(name, namespace);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error deleting role binding ${name} in ${namespace}:`, error);
    res.status(500).json({ message: `Failed to delete role binding ${name}`, error: error.message });
  }
};

// --- ClusterRoleBindings ---

// Create a ClusterRoleBinding
const createClusterRoleBinding = async (req, res) => {
  const { name, clusterRoleName, serviceAccountName, serviceAccountNamespace } = req.body;
  
  if (!name || !clusterRoleName || !serviceAccountName || !serviceAccountNamespace) {
    return res.status(400).json({ message: 'Name, clusterRoleName, serviceAccountName, and serviceAccountNamespace are required' });
  }
  
  try {
    const clusterRoleBinding = await k8sService.createClusterRoleBinding(name, clusterRoleName, serviceAccountName, serviceAccountNamespace);
    
    res.status(201).json({
      message: `ClusterRoleBinding '${name}' created successfully`,
      clusterRoleBinding
    });
  } catch (error) {
    console.error(`Error creating cluster role binding ${name}:`, error);
    let statusCode = 500;
    if (error.message && error.message.includes('already exists')) {
      statusCode = 409; // Conflict
    } else if (error.message && error.message.includes('not found')) {
      statusCode = 404; // Not Found
    }
    res.status(statusCode).json({ message: `Failed to create cluster role binding ${name}`, error: error.message });
  }
};

// Update a ClusterRoleBinding
const updateClusterRoleBinding = async (req, res) => {
  const { name } = req.params;
  const { clusterRoleName, serviceAccountName, serviceAccountNamespace } = req.body;
  if (!clusterRoleName || !serviceAccountName || !serviceAccountNamespace) {
    return res.status(400).json({ message: 'clusterRoleName, serviceAccountName and serviceAccountNamespace are required for update' });
  }
  try {
    const updatedBinding = await k8sService.updateClusterRoleBinding(name, clusterRoleName, serviceAccountName, serviceAccountNamespace);
    res.status(200).json(updatedBinding);
  } catch (error) {
    console.error(`Error updating cluster role binding ${name}:`, error);
    res.status(500).json({ message: `Failed to update cluster role binding ${name}`, error: error.message });
  }
};

// Delete a ClusterRoleBinding
const deleteClusterRoleBinding = async (req, res) => {
  const { name } = req.params;
  try {
    const result = await k8sService.deleteClusterRoleBinding(name);
    res.status(200).json(result);
  } catch (error) {
    console.error(`Error deleting cluster role binding ${name}:`, error);
    res.status(500).json({ message: `Failed to delete cluster role binding ${name}`, error: error.message });
  }
};

// Get predefined permission templates
const getPermissionTemplates = async (req, res) => {
  setCacheControlHeaders(res);
  const templates = [
    { name: 'admin', description: 'Full administrative access within namespace', rules: [{ apiGroups: ['*'], resources: ['*'], verbs: ['*'] }] },
    { name: 'developer', description: 'Access to deployments, pods, services, and related resources', rules: [{ apiGroups: ['', 'apps', 'extensions'], resources: ['deployments', 'replicasets', 'pods', 'services', 'configmaps', 'secrets'], verbs: ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'] }, { apiGroups: [''], resources: ['pods/log', 'pods/exec'], verbs: ['get', 'list', 'create'] }] },
    { name: 'viewer', description: 'Read-only access to all resources', rules: [{ apiGroups: ['*'], resources: ['*'], verbs: ['get', 'list', 'watch'] }] },
    { name: 'logs-only', description: 'Access to view logs only', rules: [{ apiGroups: [''], resources: ['pods', 'pods/log'], verbs: ['get', 'list', 'watch'] }] }
  ];
  res.status(200).json(templates);
};

// Create a ClusterRole
const createClusterRole = async (req, res) => {
  const { name, rules } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'ClusterRole name is required' });
  }
  
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return res.status(400).json({ message: 'At least one valid rule is required' });
  }
  
  try {
    const clusterRole = await k8sService.createClusterRole(name, rules);
    
    res.status(201).json({
      message: `ClusterRole '${name}' created successfully`,
      clusterRole
    });
  } catch (error) {
    console.error(`Error creating cluster role ${name}:`, error);
    let statusCode = 500;
    if (error.message && error.message.includes('already exists')) {
      statusCode = 409; // Conflict
    }
    res.status(statusCode).json({ message: `Failed to create cluster role ${name}`, error: error.message });
  }
};

// Get role bindings for a specific service account
const getRoleBindingsForServiceAccount = async (req, res) => {
  const { namespace, name } = req.params;
  
  if (!namespace || !name) {
    return res.status(400).json({ message: 'Namespace and service account name are required' });
  }
  
  try {
    // Get role bindings in the specified namespace
    const roleBindingsOutput = await execKubectl(`get rolebindings --all-namespaces -o json`);
    const roleBindingsData = JSON.parse(roleBindingsOutput);
    
    // Get cluster role bindings
    const clusterRoleBindingsOutput = await execKubectl(`get clusterrolebindings -o json`);
    const clusterRoleBindingsData = JSON.parse(clusterRoleBindingsOutput);
    
    // Filter role bindings for the specified service account
    const relevantRoleBindings = roleBindingsData.items.filter(binding => 
      binding.subjects && binding.subjects.some(subject => 
        subject.kind === 'ServiceAccount' && 
        subject.name === name && 
        subject.namespace === namespace
      )
    );
    
    // Filter cluster role bindings for the specified service account
    const relevantClusterRoleBindings = clusterRoleBindingsData.items.filter(binding => 
      binding.subjects && binding.subjects.some(subject => 
        subject.kind === 'ServiceAccount' && 
        subject.name === name && 
        subject.namespace === namespace
      )
    );
    
    setCacheControlHeaders(res);
    res.status(200).json({
      roleBindings: relevantRoleBindings,
      clusterRoleBindings: relevantClusterRoleBindings
    });
  } catch (error) {
    console.error(`Error getting role bindings for service account ${name} in namespace ${namespace}:`, error);
    res.status(500).json({ 
      message: `Failed to get role bindings for service account ${name}`, 
      error: error.message 
    });
  }
};

// Get all role bindings and cluster role bindings
const getAllRoleBindingsAndClusterRoleBindings = async (req, res) => {
  try {
    // Get all role bindings managed by our app
    const roleBindingsOutput = await execKubectl(`get rolebindings --all-namespaces -l app.kubernetes.io/managed-by=kube-user-admin -o json`);
    const roleBindingsData = JSON.parse(roleBindingsOutput);
    
    // Get all cluster role bindings managed by our app
    const clusterRoleBindingsOutput = await execKubectl(`get clusterrolebindings -l app.kubernetes.io/managed-by=kube-user-admin -o json`);
    const clusterRoleBindingsData = JSON.parse(clusterRoleBindingsOutput);
    
    console.log(`Found ${roleBindingsData.items.length} RoleBindings and ${clusterRoleBindingsData.items.length} ClusterRoleBindings managed by kube-user-admin`);
    
    setCacheControlHeaders(res);
    res.status(200).json({
      roleBindings: roleBindingsData.items,
      clusterRoleBindings: clusterRoleBindingsData.items
    });
  } catch (error) {
    console.error('Error getting all role bindings and cluster role bindings:', error);
    res.status(500).json({ 
      message: 'Failed to get role bindings and cluster role bindings', 
      error: error.message 
    });
  }
};

// Add role to ServiceAccount with multiple namespaces
const addRoleToServiceAccountMultiNamespace = async (req, res) => {
  try {
    const { serviceAccountName, serviceAccountNamespace, roleName, targetNamespaces, roleKind } = req.body;

    if (!serviceAccountName || !serviceAccountNamespace || !roleName || !targetNamespaces) {
      return res.status(400).json({ 
        error: 'serviceAccountName, serviceAccountNamespace, roleName, and targetNamespaces are required' 
      });
    }

    if (!Array.isArray(targetNamespaces) || targetNamespaces.length === 0) {
      return res.status(400).json({ 
        error: 'targetNamespaces must be a non-empty array' 
      });
    }

    console.log(`Adding role ${roleName} to ServiceAccount ${serviceAccountNamespace}/${serviceAccountName} in namespaces: ${targetNamespaces.join(', ')}`);

    const result = await k8sService.createMultiNamespaceRoleBinding(
      serviceAccountName,
      serviceAccountNamespace,
      roleName,
      targetNamespaces,
      roleKind || 'ClusterRole'
    );

    res.json({
      message: 'Role bindings created successfully',
      ...result
    });

  } catch (error) {
    console.error('Error adding role to ServiceAccount:', error);
    res.status(500).json({ 
      error: 'Failed to add role to ServiceAccount',
      details: error.message 
    });
  }
};

// Get ServiceAccount permissions across all namespaces
const getServiceAccountPermissions = async (req, res) => {
  try {
    const { serviceAccountName, serviceAccountNamespace } = req.params;

    if (!serviceAccountName || !serviceAccountNamespace) {
      return res.status(400).json({ 
        error: 'serviceAccountName and serviceAccountNamespace are required' 
      });
    }

    console.log(`Getting permissions for ServiceAccount ${serviceAccountNamespace}/${serviceAccountName}`);

    const permissions = await k8sService.getServiceAccountPermissions(
      serviceAccountName,
      serviceAccountNamespace
    );

    res.json(permissions);

  } catch (error) {
    console.error('Error getting ServiceAccount permissions:', error);
    res.status(500).json({ 
      error: 'Failed to get ServiceAccount permissions',
      details: error.message 
    });
  }
};

// Remove role from ServiceAccount (all namespaces)
const removeRoleFromServiceAccount = async (req, res) => {
  try {
    const { serviceAccountName, serviceAccountNamespace, roleName } = req.params;

    if (!serviceAccountName || !serviceAccountNamespace || !roleName) {
      return res.status(400).json({ 
        error: 'serviceAccountName, serviceAccountNamespace, and roleName are required' 
      });
    }

    console.log(`Removing role ${roleName} from ServiceAccount ${serviceAccountNamespace}/${serviceAccountName}`);

    const result = await k8sService.removeRoleFromServiceAccount(
      serviceAccountName,
      serviceAccountNamespace,
      roleName
    );

    res.json({
      message: 'Role removed successfully',
      ...result
    });

  } catch (error) {
    console.error('Error removing role from ServiceAccount:', error);
    res.status(500).json({ 
      error: 'Failed to remove role from ServiceAccount',
      details: error.message 
    });
  }
};

module.exports = {
  getAllRolesAndClusterRoles,
  getNamespaceRoles,
  createRole,
  updateRole,
  deleteRole,
  createOrUpdateClusterRole,
  deleteClusterRole,
  createRoleBinding,
  updateRoleBinding,
  deleteRoleBinding,
  createClusterRoleBinding,
  updateClusterRoleBinding,
  deleteClusterRoleBinding,
  getPermissionTemplates,
  createClusterRole,
  getRoleBindingsForServiceAccount,
  getAllRoleBindingsAndClusterRoleBindings,
  addRoleToServiceAccountMultiNamespace,
  getServiceAccountPermissions,
  removeRoleFromServiceAccount
}; 