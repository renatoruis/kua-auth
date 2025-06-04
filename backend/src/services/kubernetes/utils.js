const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Constants for resource management
const MANAGED_BY_LABEL = 'app.kubernetes.io/managed-by=kua-auth';
const DEFAULT_APP_NAMESPACE = process.env.DEFAULT_NAMESPACE || 'kua-auth';
const RESOURCE_LABEL = { 'app.kubernetes.io/managed-by': 'kua-auth' };

// Initialize Kubernetes configuration
const kubeconfig = process.env.KUBECONFIG
console.log('Using kubeconfig:', kubeconfig);

// Helper function to execute kubectl commands
const execKubectl = async (command) => {
  const fullCommand = `kubectl --kubeconfig="${kubeconfig}" ${command}`;
  console.log(`Executing: ${fullCommand}`);
  
  return new Promise((resolve, reject) => {
    exec(fullCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing kubectl: ${error.message}`);
        return reject(error);
      }
      
      if (stderr && !stdout) {
        console.error(`kubectl stderr: ${stderr}`);
        return reject(new Error(stderr));
      }
      
      return resolve(stdout);
    });
  });
};

// Create temporary file for kubectl apply
const createTempFile = (name, content) => {
  // Usar o diretório /tmp do sistema em vez do diretório do projeto
  const tmpDir = '/tmp/kua-auth';
  
  // Ensure tmp directory exists
  if (!fs.existsSync(tmpDir)) {
    console.log(`Creating tmp directory: ${tmpDir}`);
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  
  const tempFile = path.join(tmpDir, `${name}.json`);
  console.log(`Creating temporary file: ${tempFile}`);
  
  try {
    const jsonContent = JSON.stringify(content);
    console.log(`Writing content to ${tempFile}:`, jsonContent);
    fs.writeFileSync(tempFile, jsonContent);
    
    // Verify the file was created and has content
    if (fs.existsSync(tempFile)) {
      const fileStats = fs.statSync(tempFile);
      console.log(`Temporary file created successfully. Size: ${fileStats.size} bytes`);
    } else {
      throw new Error(`Failed to create temporary file: ${tempFile}`);
    }
    
    return tempFile;
  } catch (error) {
    console.error(`Error creating temporary file ${tempFile}:`, error.message);
    throw error;
  }
};

// Delete temporary file
const deleteTempFile = (tempFile) => {
  if (fs.existsSync(tempFile)) {
    fs.unlinkSync(tempFile);
  }
};

// Initialize app namespace if it doesn't exist
const initializeNamespace = async () => {
  try {
    console.log(`=== Checking if namespace ${DEFAULT_APP_NAMESPACE} exists ===`);
    // Check if namespace exists
    try {
      await execKubectl(`get namespace ${DEFAULT_APP_NAMESPACE}`);
      console.log(`Namespace ${DEFAULT_APP_NAMESPACE} already exists`);
    } catch (error) {
      // Create namespace if it doesn't exist
      console.log(`Creating namespace ${DEFAULT_APP_NAMESPACE} - it doesn't exist yet`);
      
      const namespace = {
        apiVersion: 'v1',
        kind: 'Namespace',
        metadata: {
          name: DEFAULT_APP_NAMESPACE,
          labels: RESOURCE_LABEL
        }
      };
      
      const tempFile = createTempFile('app-namespace', namespace);
      try {
        await execKubectl(`apply -f ${tempFile}`);
        console.log(`Successfully created namespace ${DEFAULT_APP_NAMESPACE}`);
      } catch (nsErr) {
        console.error(`Error creating namespace ${DEFAULT_APP_NAMESPACE}:`, nsErr.message);
        throw nsErr;
      } finally {
        deleteTempFile(tempFile);
      }
    }
    return true;
  } catch (error) {
    console.error(`Error initializing namespace: ${error.message}`);
    return false;
  }
};

module.exports = {
  kubeconfig,
  execKubectl,
  createTempFile,
  deleteTempFile,
  MANAGED_BY_LABEL,
  DEFAULT_APP_NAMESPACE,
  RESOURCE_LABEL,
  initializeNamespace
}; 