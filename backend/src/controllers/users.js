const k8sService = require('../services/kubernetes');

// Helper function to set cache control headers
const setCacheControlHeaders = (res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Expires': '-1',
    'Pragma': 'no-cache'
  });
};

// Get all users (service accounts)
const getAllUsers = async (req, res) => {
  try {
    const users = await k8sService.getServiceAccounts();
    setCacheControlHeaders(res);
    res.status(200).json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Failed to get users', error: error.message });
  }
};

// Get a specific user
const getUser = async (req, res) => {
  const { namespace, name } = req.params;
  try {
    const users = await k8sService.getServiceAccounts(namespace);
    const user = users.find(u => u.metadata.name === name);
    if (!user) {
      return res.status(404).json({ message: `User ${name} not found in namespace ${namespace}` });
    }
    setCacheControlHeaders(res);
    res.status(200).json(user);
  } catch (error) {
    console.error(`Error getting user ${name}:`, error);
    res.status(500).json({ message: `Failed to get user ${name}`, error: error.message });
  }
};

// Create a user (service account)
const createUser = async (req, res) => {
  const {
    name,
    namespace = k8sService.DEFAULT_APP_NAMESPACE, 
    grantViewAccess = false,
    grantEditAccess = false
  } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'User name is required' });
  }
  
  let user = null; // ServiceAccount object from Kubernetes
  let warnings = [];
  
  try {
    console.log(`CONTROLLER: Starting user creation process for ${name}`);
    console.log(`CONTROLLER: Parameters - Namespace: ${namespace}, View: ${grantViewAccess}, Edit: ${grantEditAccess}`);
    
    // 1. Create ServiceAccount and process associated roles/bindings
    try {
      user = await k8sService.createServiceAccount(name, namespace, grantViewAccess, grantEditAccess);
      console.log(`CONTROLLER: k8sService.createServiceAccount returned. User object defined: ${!!user}`);
      
      if (user && user._roleWarnings && Array.isArray(user._roleWarnings) && user._roleWarnings.length > 0) {
        console.log(`CONTROLLER: Role/Binding warnings from service for ${name}:`, user._roleWarnings);
        warnings.push(...user._roleWarnings);
        try {
          delete user._roleWarnings; // Clean up internal property
        } catch (deleteErr) {
          console.error(`CONTROLLER: Error deleting _roleWarnings for ${name}:`, deleteErr.message);
          warnings.push('Internal error cleaning up role warnings.');
        }
      } else if (user) {
        console.log(`CONTROLLER: No _roleWarnings found on user object for ${name}, or it was empty.`);
      }
    } catch (saCreationError) {
      console.error(`CONTROLLER: FATAL error from k8sService.createServiceAccount for ${name}:`, saCreationError.message, saCreationError.stack);
      let statusCode = 500;
      if (saCreationError.message && saCreationError.message.includes('already exists')) {
        statusCode = 409;
      }
      return res.status(statusCode).json({ 
        message: `Failed to create ServiceAccount '${name}'`, 
        error: saCreationError.message 
      });
    }
    
    // At this point, 'user' should be the created ServiceAccount object, possibly with issues if primary creation failed.
    // If 'user' is null/undefined here, it means createServiceAccount threw an error caught above.
    if (!user || !user.metadata || !user.metadata.name) {
      console.error(`CONTROLLER: User object for ${name} is invalid or incomplete after SA creation call. User:`, JSON.stringify(user, null, 2));
      // This is a critical issue if we expected a user object.
      // However, createServiceAccount should throw if SA creation itself fails.
      // If it gets here with an invalid user object, it's an unexpected state.
      warnings.push('User object appears invalid after creation attempt. Full details may be missing.');
    }

    // 2. Generate Kubeconfig (optional, can fail without failing the whole request)
    let kubeconfig = null;
    if (user && user.metadata && user.metadata.name) { // Proceed only if we have a valid user object
      try {
        console.log(`CONTROLLER: Attempting to generate kubeconfig for ${name}...`);
        kubeconfig = await k8sService.generateKubeconfig(name, user.metadata.namespace || namespace);
        console.log(`CONTROLLER: Kubeconfig generation for ${name} successful.`);
      } catch (kubeconfigErr) {
        console.error(`CONTROLLER: Error generating kubeconfig for ${name}:`, kubeconfigErr.message, kubeconfigErr.stack);
        warnings.push(`Kubeconfig generation failed: ${kubeconfigErr.message}`);
      }
    } else {
      console.log(`CONTROLLER: Skipping kubeconfig generation for ${name} due to missing/invalid user object.`);
      if (name) { // If we at least have a name, note it in warnings
           warnings.push(`Kubeconfig not generated for '${name}' as user data was incomplete.`);
      }
    }
    
    // 3. Build the response
    let successMessage = `Service Account '${name}' processing completed.`;
    if (user && user.metadata && user.metadata.name && user.metadata.namespace) {
      successMessage = `Service Account '${user.metadata.name}' in namespace '${user.metadata.namespace}' processed.`;
      if (grantViewAccess) successMessage += ' View access provisioning attempted.';
      if (grantEditAccess) successMessage += ' Edit access provisioning attempted.';
    }

    const responseObject = {
      message: successMessage,
      user: user || { name, warning: "User object was not fully created/retrieved." }, // Provide minimal user info if full object failed
      kubeconfig: kubeconfig || null,
      warnings: warnings.length > 0 ? warnings : undefined,
      warning: warnings.length > 0 ? warnings.join('; ') : undefined // For backward compatibility
    };

    if (warnings.length > 0) {
        console.log(`CONTROLLER: Final response for ${name} will include warnings:`, responseObject.warnings);
    }

    console.log(`CONTROLLER: Preparing to send 201 response for ${name}. Final response object:`, JSON.stringify(responseObject, null, 2));
    return res.status(201).json(responseObject);
    
  } catch (unexpectedError) {
    // This final catch is for truly unexpected errors within the controller logic itself.
    console.error(`CONTROLLER: FATAL UNEXPECTED error in createUser for ${name}:`, unexpectedError.message, unexpectedError.stack);
    
    // Try to provide a response even in this case.
    // If 'user' (from outer scope) has some data, include its name/namespace.
    let errorResponseUserName = name; // Default to the request name
    let errorResponseUserNamespace = namespace; // Default to request namespace
    if (user && user.metadata) {
        errorResponseUserName = user.metadata.name || name;
        errorResponseUserNamespace = user.metadata.namespace || namespace;
    }

    return res.status(500).json({ 
      message: `Server error during creation of user '${errorResponseUserName}'.`, 
      error: unexpectedError.message,
      details: "An unhandled exception occurred in the user creation controller.",
      context: {
        userName: errorResponseUserName,
        userNamespace: errorResponseUserNamespace,
        attemptedViewAccess: grantViewAccess,
        attemptedEditAccess: grantEditAccess
      }
    });
  }
};

// Delete a user
const deleteUser = async (req, res) => {
  const { namespace, name } = req.params;
  try {
    const result = await k8sService.deleteServiceAccount(name, namespace);
    res.status(200).json({
      message: `User ${name} deleted successfully`,
      result
    });
  } catch (error) {
    console.error(`Error deleting user ${name}:`, error);
    res.status(500).json({ message: `Failed to delete user ${name}`, error: error.message });
  }
};

// Generate kubeconfig for a user
const generateUserKubeconfig = async (req, res) => {
  const { namespace, name } = req.params;
  try {
    console.log(`Generating kubeconfig for user ${name} in namespace ${namespace}`);
    const kubeconfig = await k8sService.generateKubeconfig(name, namespace);
    if (!kubeconfig) {
      console.error(`Empty kubeconfig returned for ${name}`);
      return res.status(500).json({ 
        message: `Failed to generate kubeconfig for user ${name}: Empty kubeconfig returned`
      });
    }
    
    // Definir headers para download de arquivo
    res.set({
      'Content-Type': 'application/x-yaml',
      'Content-Disposition': `attachment; filename=${name}-kubeconfig.yaml`
    });
    
    // Enviar o kubeconfig diretamente como texto
    res.send(kubeconfig);
  } catch (error) {
    console.error(`Error generating kubeconfig for user ${name}:`, error);
    res.status(500).json({ 
      message: `Failed to generate kubeconfig for user ${name}`, 
      error: error.message 
    });
  }
};

module.exports = {
  getAllUsers,
  getUser,
  createUser,
  deleteUser,
  generateUserKubeconfig
}; 