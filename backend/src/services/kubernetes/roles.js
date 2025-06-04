const { 
  execKubectl, 
  createTempFile, 
  deleteTempFile, 
  MANAGED_BY_LABEL, 
  DEFAULT_APP_NAMESPACE, 
  RESOURCE_LABEL 
} = require('./utils');

// Get all roles
const getRoles = async (namespace = '') => {
  console.log('=== Getting roles ===');
  
  try {
    let command;
    if (namespace) {
      // Buscando roles gerenciadas pelo app neste namespace específico
      command = `get roles -n ${namespace} -l app.kubernetes.io/managed-by=kua-auth -o json`;
    } else {
      // Buscando todas as roles gerenciadas pelo app em todos os namespaces
      command = `get roles --all-namespaces -l app.kubernetes.io/managed-by=kua-auth -o json`;
    }
    
    const output = await execKubectl(command);
    const data = JSON.parse(output);
    
    if (data && data.items) {
      console.log(`Found ${data.items.length} roles${namespace ? ` in namespace ${namespace}` : ''} managed by kua-auth`);
      return data.items;
    }
    
    throw new Error('No roles found in kubectl output');
  } catch (error) {
    console.error('Error getting roles:', error.message);
    return [];
  }
};

// Get all cluster roles
const getClusterRoles = async () => {
  console.log('=== Getting cluster roles ===');
  
  try {
    // Buscando cluster roles gerenciadas pelo app
    const output = await execKubectl(`get clusterroles -l app.kubernetes.io/managed-by=kua-auth -o json`);
    const data = JSON.parse(output);
    
    if (data && data.items) {
      console.log(`Found ${data.items.length} cluster roles managed by kua-auth`);
      return data.items;
    }
    
    throw new Error('No cluster roles found in kubectl output');
  } catch (error) {
    console.error('Error getting cluster roles:', error.message);
    return [];
  }
};

// Create a role - simplificado
const createRole = async (name, namespace = DEFAULT_APP_NAMESPACE, rules) => {
  if (!name || !namespace || !rules) {
    throw new Error('name, namespace, and rules are required');
  }
  
  console.log(`Creating role ${name} in namespace ${namespace}`);
  
  const role = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name: name,
      namespace: namespace,
      labels: RESOURCE_LABEL
    },
    rules: rules
  };
  
  const tempFile = createTempFile(`${name}-role`, role);
  
  try {
    const output = await execKubectl(`apply -f ${tempFile}`);
    console.log(`Role ${name} created: ${output}`);
    return { name, namespace, created: true };
  } catch (error) {
    console.error(`Error creating role ${name}:`, error.message);
    throw error;
  } finally {
    deleteTempFile(tempFile);
  }
};

// Create a role binding - ainda mais simplificado
const createRoleBinding = async (name, namespace = DEFAULT_APP_NAMESPACE, roleName, serviceAccountName, serviceAccountNamespace = namespace, roleKind = 'Role') => {
  if (!name || !namespace || !roleName || !serviceAccountName) {
    throw new Error('name, namespace, roleName, and serviceAccountName are required');
  }
  
  if (roleKind !== 'Role' && roleKind !== 'ClusterRole') {
    throw new Error('roleKind must be either "Role" or "ClusterRole"');
  }
  
  console.log(`Creating role binding ${name} in namespace ${namespace} using direct kubectl command`);
  console.log(`Role kind: ${roleKind}, Role name: ${roleName}, ServiceAccount: ${serviceAccountNamespace}:${serviceAccountName}`);
  
  try {
    // For ClusterRole, use --clusterrole instead of --role
    const roleFlag = roleKind === 'Role' ? `--role=${roleName}` : `--clusterrole=${roleName}`;
    
    const output = await execKubectl(
      `create rolebinding ${name} ${roleFlag} --serviceaccount=${serviceAccountNamespace}:${serviceAccountName} -n ${namespace} --dry-run=client -o yaml | kubectl apply -f -`
    );
    
    console.log(`RoleBinding ${name} created using direct kubectl command: ${output}`);
    
    // Add management label
    try {
      await execKubectl(`label rolebinding ${name} -n ${namespace} app.kubernetes.io/managed-by=kua-auth`);
      console.log(`Added management label to RoleBinding ${name}`);
    } catch (labelError) {
      console.warn(`Could not add management label to RoleBinding ${name}: ${labelError.message}`);
      // Don't fail because of the label
    }
    
    return { name, namespace, created: true };
  } catch (error) {
    console.error(`Error creating role binding ${name}:`, error.message);
    throw error;
  }
};

// Create a cluster role binding
const createClusterRoleBinding = async (name, clusterRoleName, serviceAccountName, namespace = DEFAULT_APP_NAMESPACE) => {
  if (!name || !clusterRoleName || !serviceAccountName || !namespace) {
    throw new Error('name, clusterRoleName, serviceAccountName, and namespace are required');
  }
  
  console.log(`=== Creating cluster role binding ${name} ===`);
  
  // Only allow binding to specific built-in ClusterRoles that are safe to bind to
  const allowedClusterRoles = ['view', 'edit', 'admin', 'cluster-admin'];
  
  // If it's not a built-in role, check if it's managed by us
  if (!allowedClusterRoles.includes(clusterRoleName)) {
    try {
      const crOutput = await execKubectl(`get clusterrole ${clusterRoleName} -o json`);
      const cr = JSON.parse(crOutput);
      
      if (!cr.metadata.labels || cr.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
        throw new Error(`ClusterRole ${clusterRoleName} is not managed by kua-auth and is not a standard role. Cluster role binding creation blocked for safety.`);
      }
    } catch (error) {
      console.error(`Error verifying cluster role: ${error.message}`);
      throw error;
    }
  }
  
  // Check if the service account exists and is managed by us
  try {
    const saOutput = await execKubectl(`get serviceaccount ${serviceAccountName} -n ${namespace} -o json`);
    const sa = JSON.parse(saOutput);
    
    if (!sa.metadata.labels || sa.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`Service account ${serviceAccountName} is not managed by kua-auth. Cluster role binding creation blocked for safety.`);
    }
  } catch (error) {
    console.error(`Error verifying service account: ${error.message}`);
    throw error;
  }
  
  const clusterRoleBinding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRoleBinding',
    metadata: {
      name,
      labels: RESOURCE_LABEL
    },
    subjects: [
      {
        kind: 'ServiceAccount',
        name: serviceAccountName,
        namespace
      }
    ],
    roleRef: {
      kind: 'ClusterRole',
      name: clusterRoleName,
      apiGroup: 'rbac.authorization.k8s.io'
    }
  };
  
  // Save the cluster role binding definition to a temporary file
  const tempFile = createTempFile(`${name}-clusterrolebinding`, clusterRoleBinding);
  
  try {
    const output = await execKubectl(`apply -f ${tempFile}`);
    console.log('Cluster role binding created:', output);
    
    // Get the created cluster role binding
    const crbOutput = await execKubectl(`get clusterrolebinding ${name} -o json`);
    const result = JSON.parse(crbOutput);
    
    // Clean up temporary file
    deleteTempFile(tempFile);
    
    return result;
  } catch (error) {
    // Clean up temporary file
    deleteTempFile(tempFile);
    
    console.error(`Error creating cluster role binding ${name}:`, error.message);
    throw error;
  }
};

// Update a Role
const updateRole = async (name, namespace, rules) => {
  if (!name || !namespace || !rules || !Array.isArray(rules)) {
    throw new Error('name, namespace, and rules (array) are required for updating a role');
  }

  console.log(`=== Updating role ${name} in namespace ${namespace} ===`);

  // First, verify it's a managed resource
  try {
    const existingRoleOutput = await execKubectl(`get role ${name} -n ${namespace} -o json`);
    const existingRole = JSON.parse(existingRoleOutput);
    if (!existingRole.metadata.labels || existingRole.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`Role ${name} in namespace ${namespace} is not managed by kua-auth. Update blocked.`);
    }
  } catch (error) {
    console.error(`Error verifying role before update: ${error.message}`);
    // If the role doesn't exist or isn't managed, rethrow the error
    throw new Error(`Cannot update role: ${error.message}`);
  }
  
  const role = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'Role',
    metadata: {
      name,
      namespace,
      labels: RESOURCE_LABEL // Ensure our label is present
    },
    rules
  };
  
  const tempFile = createTempFile(`${name}-role-update`, role);
  
  try {
    const output = await execKubectl(`apply -f ${tempFile}`); // Apply will update if it exists
    console.log('Role updated:', output);
    
    const updatedRoleOutput = await execKubectl(`get role ${name} -n ${namespace} -o json`);
    const result = JSON.parse(updatedRoleOutput);
    
    deleteTempFile(tempFile);
    return result;
  } catch (error) {
    deleteTempFile(tempFile);
    console.error(`Error updating role ${name}:`, error.message);
    throw error;
  }
};

// Delete a Role
const deleteRole = async (name, namespace) => {
  if (!name || !namespace) {
    throw new Error('name and namespace are required for deleting a role');
  }

  console.log(`=== Deleting role ${name} from namespace ${namespace} ===`);

  // First, verify it's a managed resource
  try {
    const roleOutput = await execKubectl(`get role ${name} -n ${namespace} -o json`);
    const role = JSON.parse(roleOutput);
    if (!role.metadata.labels || role.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`Role ${name} in namespace ${namespace} is not managed by kua-auth. Deletion blocked.`);
    }
  } catch (error) {
    console.error(`Error verifying role before deletion: ${error.message}`);
    throw new Error(`Cannot delete role: ${error.message}`);
  }

  try {
    const output = await execKubectl(`delete role ${name} -n ${namespace}`);
    console.log('Role deleted:', output);
    return { status: 'success', message: `Role ${name} deleted successfully from namespace ${namespace}.` };
  } catch (error) {
    console.error(`Error deleting role ${name}:`, error.message);
    throw error;
  }
};

// Update a RoleBinding
const updateRoleBinding = async (name, namespace, roleName, serviceAccountName, serviceAccountNamespace = namespace, roleKind = 'Role') => {
  if (!name || !namespace || !roleName || !serviceAccountName) {
    throw new Error('name, namespace, roleName, and serviceAccountName are required for updating role binding');
  }

  if (roleKind !== 'Role' && roleKind !== 'ClusterRole') {
    throw new Error('roleKind must be either "Role" or "ClusterRole"');
  }

  console.log(`=== Updating role binding ${name} in namespace ${namespace} ===`);
  console.log(`Role kind: ${roleKind}, Role name: ${roleName}, ServiceAccount: ${serviceAccountName}, SA Namespace: ${serviceAccountNamespace}`);

  // Verify it's a managed resource
  try {
    const existingRbOutput = await execKubectl(`get rolebinding ${name} -n ${namespace} -o json`);
    const existingRb = JSON.parse(existingRbOutput);
    if (!existingRb.metadata.labels || existingRb.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`RoleBinding ${name} in namespace ${namespace} is not managed by kua-auth. Update blocked.`);
    }
  } catch (error) {
    console.error(`Error verifying role binding before update: ${error.message}`);
    throw new Error(`Cannot update role binding: ${error.message}`);
  }

  // Verifications for role and service account
  try {
    if (roleKind === 'Role') {
      const roleOutput = await execKubectl(`get role ${roleName} -n ${namespace} -o json`);
      const role = JSON.parse(roleOutput);
      if (!role.metadata.labels || role.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
        throw new Error(`Role ${roleName} is not managed by kua-auth. Update blocked.`);
      }
    } else { // ClusterRole
      const crOutput = await execKubectl(`get clusterrole ${roleName} -o json`);
      const cr = JSON.parse(crOutput);
      if (!cr.metadata.labels || cr.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
        // Allow built-in cluster roles
        const builtInRoles = ['view', 'edit', 'admin', 'cluster-admin'];
        if (!builtInRoles.includes(roleName)) {
          throw new Error(`ClusterRole ${roleName} is not managed by kua-auth. Update blocked.`);
        }
      }
    }
  } catch (error) {
    throw new Error(`Error verifying role for binding update: ${error.message}`);
  }

  try {
    const saOutput = await execKubectl(`get serviceaccount ${serviceAccountName} -n ${serviceAccountNamespace} -o json`);
    const sa = JSON.parse(saOutput);
    if (!sa.metadata.labels || sa.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`ServiceAccount ${serviceAccountName} is not managed by kua-auth. Update blocked.`);
    }
  } catch (error) {
    throw new Error(`Error verifying service account for binding update: ${error.message}`);
  }

  const roleBinding = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'RoleBinding',
    metadata: {
      name,
      namespace,
      labels: RESOURCE_LABEL
    },
    subjects: [{ kind: 'ServiceAccount', name: serviceAccountName, namespace: serviceAccountNamespace }],
    roleRef: { kind: roleKind, name: roleName, apiGroup: 'rbac.authorization.k8s.io' }
  };

  const tempFile = createTempFile(`${name}-rolebinding-update`, roleBinding);

  try {
    const output = await execKubectl(`apply -f ${tempFile}`);
    console.log('RoleBinding updated:', output);
    const updatedRbOutput = await execKubectl(`get rolebinding ${name} -n ${namespace} -o json`);
    const result = JSON.parse(updatedRbOutput);
    deleteTempFile(tempFile);
    return result;
  } catch (error) {
    deleteTempFile(tempFile);
    console.error(`Error updating role binding ${name}:`, error.message);
    throw error;
  }
};

// Create a ClusterRole
const createClusterRole = async (name, rules) => {
  if (!name || !rules || !Array.isArray(rules)) {
    throw new Error('name and rules (array) are required for creating a cluster role');
  }

  console.log(`=== Creating cluster role ${name} ===`);
  
  const clusterRole = {
    apiVersion: 'rbac.authorization.k8s.io/v1',
    kind: 'ClusterRole',
    metadata: {
      name,
      labels: RESOURCE_LABEL
    },
    rules
  };
  
  const tempFile = createTempFile(`${name}-clusterrole`, clusterRole);
  
  try {
    const output = await execKubectl(`apply -f ${tempFile}`);
    console.log('ClusterRole created:', output);
    
    const crOutput = await execKubectl(`get clusterrole ${name} -o json`);
    const result = JSON.parse(crOutput);
    
    deleteTempFile(tempFile);
    return result;
  } catch (error) {
    deleteTempFile(tempFile);
    console.error(`Error creating cluster role ${name}:`, error.message);
    throw error;
  }
};

// Delete a ClusterRole
const deleteClusterRole = async (name) => {
  if (!name) {
    throw new Error('name is required for deleting a cluster role');
  }

  console.log(`=== Deleting cluster role ${name} ===`);

  // First, verify it's a managed resource
  try {
    const clusterRoleOutput = await execKubectl(`get clusterrole ${name} -o json`);
    const clusterRole = JSON.parse(clusterRoleOutput);
    if (!clusterRole.metadata.labels || clusterRole.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`ClusterRole ${name} is not managed by kua-auth. Deletion blocked.`);
    }
  } catch (error) {
    console.error(`Error verifying cluster role before deletion: ${error.message}`);
    throw new Error(`Cannot delete cluster role: ${error.message}`);
  }

  try {
    const output = await execKubectl(`delete clusterrole ${name}`);
    console.log('ClusterRole deleted:', output);
    return { status: 'success', message: `ClusterRole ${name} deleted successfully.` };
  } catch (error) {
    console.error(`Error deleting cluster role ${name}:`, error.message);
    throw error;
  }
};

// Delete a RoleBinding
const deleteRoleBinding = async (name, namespace) => {
  if (!name || !namespace) {
    throw new Error('name and namespace are required for deleting a role binding');
  }

  console.log(`=== Deleting role binding ${name} from namespace ${namespace} ===`);

  // First, verify it's a managed resource
  try {
    const roleBindingOutput = await execKubectl(`get rolebinding ${name} -n ${namespace} -o json`);
    const roleBinding = JSON.parse(roleBindingOutput);
    if (!roleBinding.metadata.labels || roleBinding.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`RoleBinding ${name} in namespace ${namespace} is not managed by kua-auth. Deletion blocked.`);
    }
  } catch (error) {
    console.error(`Error verifying role binding before deletion: ${error.message}`);
    throw new Error(`Cannot delete role binding: ${error.message}`);
  }

  try {
    const output = await execKubectl(`delete rolebinding ${name} -n ${namespace}`);
    console.log('RoleBinding deleted:', output);
    return { status: 'success', message: `RoleBinding ${name} deleted successfully from namespace ${namespace}.` };
  } catch (error) {
    console.error(`Error deleting role binding ${name}:`, error.message);
    throw error;
  }
};

// Delete a ClusterRoleBinding
const deleteClusterRoleBinding = async (name) => {
  if (!name) {
    throw new Error('name is required for deleting a cluster role binding');
  }

  console.log(`=== Deleting cluster role binding ${name} ===`);

  // First, verify it's a managed resource
  try {
    const clusterRoleBindingOutput = await execKubectl(`get clusterrolebinding ${name} -o json`);
    const clusterRoleBinding = JSON.parse(clusterRoleBindingOutput);
    if (!clusterRoleBinding.metadata.labels || clusterRoleBinding.metadata.labels['app.kubernetes.io/managed-by'] !== 'kua-auth') {
      throw new Error(`ClusterRoleBinding ${name} is not managed by kua-auth. Deletion blocked.`);
    }
  } catch (error) {
    console.error(`Error verifying cluster role binding before deletion: ${error.message}`);
    throw new Error(`Cannot delete cluster role binding: ${error.message}`);
  }

  try {
    const output = await execKubectl(`delete clusterrolebinding ${name}`);
    console.log('ClusterRoleBinding deleted:', output);
    return { status: 'success', message: `ClusterRoleBinding ${name} deleted successfully.` };
  } catch (error) {
    console.error(`Error deleting cluster role binding ${name}:`, error.message);
    throw error;
  }
};

// Create multiple RoleBindings for a ServiceAccount across multiple namespaces
const createMultiNamespaceRoleBinding = async (serviceAccountName, serviceAccountNamespace, roleName, targetNamespaces, roleKind = 'ClusterRole') => {
  if (!serviceAccountName || !serviceAccountNamespace || !roleName || !targetNamespaces || !Array.isArray(targetNamespaces)) {
    throw new Error('serviceAccountName, serviceAccountNamespace, roleName, and targetNamespaces (array) are required');
  }

  console.log(`=== Creating multi-namespace role binding for ${serviceAccountName} ===`);
  console.log(`Role: ${roleKind}/${roleName}, Target namespaces: ${targetNamespaces.join(', ')}`);

  const results = [];
  const errors = [];

  for (const targetNamespace of targetNamespaces) {
    try {
      const bindingName = `${serviceAccountName}-${roleName}-${targetNamespace}`;
      
      const result = await createRoleBinding(
        bindingName,
        targetNamespace,
        roleName,
        serviceAccountName,
        serviceAccountNamespace,
        roleKind
      );
      
      results.push({
        namespace: targetNamespace,
        bindingName,
        success: true,
        result
      });
      
      console.log(`✓ Created RoleBinding ${bindingName} in namespace ${targetNamespace}`);
    } catch (error) {
      console.error(`✗ Failed to create RoleBinding in namespace ${targetNamespace}:`, error.message);
      errors.push({
        namespace: targetNamespace,
        error: error.message
      });
    }
  }

  return {
    successful: results,
    failed: errors,
    summary: `Created ${results.length} RoleBindings, ${errors.length} failed`
  };
};

// Get all RoleBindings for a specific ServiceAccount across all namespaces
const getServiceAccountPermissions = async (serviceAccountName, serviceAccountNamespace) => {
  if (!serviceAccountName || !serviceAccountNamespace) {
    throw new Error('serviceAccountName and serviceAccountNamespace are required');
  }

  console.log(`=== Getting permissions for ServiceAccount ${serviceAccountNamespace}/${serviceAccountName} ===`);

  try {
    // Get all RoleBindings
    const roleBindingsOutput = await execKubectl(`get rolebindings --all-namespaces -o json`);
    const roleBindingsData = JSON.parse(roleBindingsOutput);

    // Get all ClusterRoleBindings
    const clusterRoleBindingsOutput = await execKubectl(`get clusterrolebindings -o json`);
    const clusterRoleBindingsData = JSON.parse(clusterRoleBindingsOutput);

    // Filter RoleBindings for this ServiceAccount
    const relevantRoleBindings = roleBindingsData.items.filter(binding =>
      binding.subjects && binding.subjects.some(subject =>
        subject.kind === 'ServiceAccount' &&
        subject.name === serviceAccountName &&
        subject.namespace === serviceAccountNamespace
      )
    );

    // Filter ClusterRoleBindings for this ServiceAccount
    const relevantClusterRoleBindings = clusterRoleBindingsData.items.filter(binding =>
      binding.subjects && binding.subjects.some(subject =>
        subject.kind === 'ServiceAccount' &&
        subject.name === serviceAccountName &&
        subject.namespace === serviceAccountNamespace
      )
    );

    // Group RoleBindings by role name
    const permissionsByRole = {};

    relevantRoleBindings.forEach(binding => {
      const roleName = binding.roleRef.name;
      const roleKind = binding.roleRef.kind;
      const namespace = binding.metadata.namespace;

      if (!permissionsByRole[roleName]) {
        permissionsByRole[roleName] = {
          roleName,
          roleKind,
          namespaces: [],
          bindings: []
        };
      }

      permissionsByRole[roleName].namespaces.push(namespace);
      permissionsByRole[roleName].bindings.push(binding);
    });

    relevantClusterRoleBindings.forEach(binding => {
      const roleName = binding.roleRef.name;
      const roleKind = binding.roleRef.kind;

      if (!permissionsByRole[roleName]) {
        permissionsByRole[roleName] = {
          roleName,
          roleKind,
          namespaces: ['*'], // Cluster-wide
          bindings: []
        };
      } else if (!permissionsByRole[roleName].namespaces.includes('*')) {
        permissionsByRole[roleName].namespaces.push('*');
      }

      permissionsByRole[roleName].bindings.push(binding);
    });

    return {
      serviceAccount: {
        name: serviceAccountName,
        namespace: serviceAccountNamespace
      },
      permissions: Object.values(permissionsByRole),
      summary: {
        totalRoles: Object.keys(permissionsByRole).length,
        roleBindings: relevantRoleBindings.length,
        clusterRoleBindings: relevantClusterRoleBindings.length
      }
    };

  } catch (error) {
    console.error('Error getting ServiceAccount permissions:', error.message);
    throw error;
  }
};

// Remove all RoleBindings for a specific role from a ServiceAccount
const removeRoleFromServiceAccount = async (serviceAccountName, serviceAccountNamespace, roleName) => {
  if (!serviceAccountName || !serviceAccountNamespace || !roleName) {
    throw new Error('serviceAccountName, serviceAccountNamespace, and roleName are required');
  }

  console.log(`=== Removing role ${roleName} from ServiceAccount ${serviceAccountNamespace}/${serviceAccountName} ===`);

  const results = [];
  const errors = [];

  try {
    // Get current permissions
    const permissions = await getServiceAccountPermissions(serviceAccountName, serviceAccountNamespace);
    
    // Find the role to remove
    const roleToRemove = permissions.permissions.find(p => p.roleName === roleName);
    
    if (!roleToRemove) {
      throw new Error(`Role ${roleName} not found for ServiceAccount ${serviceAccountName}`);
    }

    // Remove all bindings for this role
    for (const binding of roleToRemove.bindings) {
      try {
        if (binding.kind === 'RoleBinding') {
          await deleteRoleBinding(binding.metadata.name, binding.metadata.namespace);
          results.push({
            type: 'RoleBinding',
            name: binding.metadata.name,
            namespace: binding.metadata.namespace,
            success: true
          });
        } else if (binding.kind === 'ClusterRoleBinding') {
          await deleteClusterRoleBinding(binding.metadata.name);
          results.push({
            type: 'ClusterRoleBinding',
            name: binding.metadata.name,
            success: true
          });
        }
      } catch (error) {
        errors.push({
          type: binding.kind,
          name: binding.metadata.name,
          namespace: binding.metadata.namespace,
          error: error.message
        });
      }
    }

    return {
      successful: results,
      failed: errors,
      summary: `Removed ${results.length} bindings, ${errors.length} failed`
    };

  } catch (error) {
    console.error('Error removing role from ServiceAccount:', error.message);
    throw error;
  }
};

module.exports = {
  getRoles,
  getClusterRoles,
  createRole,
  updateRole,
  deleteRole,
  createRoleBinding,
  updateRoleBinding,
  deleteRoleBinding,
  createClusterRoleBinding,
  deleteClusterRoleBinding,
  createClusterRole,
  deleteClusterRole,
  createMultiNamespaceRoleBinding,
  getServiceAccountPermissions,
  removeRoleFromServiceAccount
};