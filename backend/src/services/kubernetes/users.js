const fs = require('fs');
const yaml = require('js-yaml');
const { 
  execKubectl, 
  createTempFile, 
  deleteTempFile, 
  MANAGED_BY_LABEL, 
  DEFAULT_APP_NAMESPACE, 
  RESOURCE_LABEL 
} = require('./utils');
const { createRole, createRoleBinding } = require('./roles'); // Renamed to match actual function names

// Default rules for view and edit roles
const VIEW_RULES = [
  {
    apiGroups: ["", "apps", "batch", "extensions", "networking.k8s.io"], 
    resources: ["pods", "services", "deployments", "statefulsets", "daemonsets", "replicasets", "jobs", "cronjobs", "configmaps", "secrets", "ingresses", "persistentvolumeclaims", "serviceaccounts", "roles", "rolebindings"],
    verbs: ["get", "list", "watch"]
  }
];

const EDIT_RULES = [
  {
    apiGroups: ["", "apps", "batch", "extensions", "networking.k8s.io"],
    resources: ["pods", "services", "deployments", "statefulsets", "daemonsets", "replicasets", "jobs", "cronjobs", "configmaps", "secrets", "ingresses", "persistentvolumeclaims", "serviceaccounts", "roles", "rolebindings"],
    verbs: ["get", "list", "watch", "create", "update", "patch", "delete"]
  }
];

// Get all service accounts (our "users")
const getServiceAccounts = async (namespace = '') => {
  console.log('=== Getting service accounts ===');
  
  try {
    let command;
    // Filter by label to get only resources managed by our app
    if (namespace) {
      command = `get serviceaccounts -n ${namespace} -l ${MANAGED_BY_LABEL} -o json`;
    } else {
      // If no namespace specified, prefer our default namespace but can still see all
      command = `get serviceaccounts --all-namespaces -l ${MANAGED_BY_LABEL} -o json`;
    }
    
    const output = await execKubectl(command);
    const data = JSON.parse(output);
    
    if (data && data.items) {
      console.log(`Found ${data.items.length} service accounts${namespace ? ` in namespace ${namespace}` : ''}`);
      return data.items;
    }
    
    throw new Error('No service accounts found in kubectl output');
  } catch (error) {
    console.error('Error getting service accounts:', error.message);
    return [];
  }
};

// Create a service account (user) - com logs detalhados
const createServiceAccount = async (name, namespace = DEFAULT_APP_NAMESPACE, grantViewAccess = false, grantEditAccess = false) => {
  if (!name || !namespace) {
    throw new Error('Service Account name and namespace are required');
  }
  
  console.log(`[SA-CREATE] Iniciando criação de SA: ${name} in ${namespace}`);
  console.log(`[SA-CREATE] Opções: View=${grantViewAccess}, Edit=${grantEditAccess}`);

  // 1. Criar ServiceAccount
  const serviceAccountManifest = {
    apiVersion: 'v1',
    kind: 'ServiceAccount',
    metadata: { 
      name: name, 
      namespace: namespace, 
      labels: RESOURCE_LABEL 
    }
  };
  
  const tempFileSA = createTempFile(`${name}-sa`, serviceAccountManifest);
  let createdServiceAccount;

  try {
    // Aplicar o manifesto do ServiceAccount
    console.log(`[SA-CREATE] Aplicando manifesto para ${name}`);
    await execKubectl(`apply -f ${tempFileSA}`);
    console.log(`[SA-CREATE] Manifesto aplicado com sucesso`);
    
    // Obter o ServiceAccount criado
    console.log(`[SA-CREATE] Obtendo detalhes do SA criado`);
    const saOutput = await execKubectl(`get serviceaccount ${name} -n ${namespace} -o json`);
    createdServiceAccount = JSON.parse(saOutput);
    console.log(`[SA-CREATE] SA obtido com sucesso: ${name}`);
  } catch (error) {
    console.error(`[SA-CREATE] Erro criando ServiceAccount ${name}:`, error.message);
    throw error;
  } finally {
    deleteTempFile(tempFileSA);
    console.log(`[SA-CREATE] Arquivo temporário ${tempFileSA} removido`);
  }

  // 2. Criar Role e RoleBinding conforme necessário
  let warnings = [];
  
  if (grantEditAccess) {
    console.log(`[SA-CREATE] Iniciando concessão de permissões EDIT para ${name}`);
    const roleName = `${name}-edit-role`;
    const roleBindingName = `${name}-edit-binding`;
    
    try {
      // Criar Role de edição
      console.log(`[SA-CREATE] Criando role ${roleName}`);
      await createRole(roleName, namespace, EDIT_RULES);
      console.log(`[SA-CREATE] Role ${roleName} criada com sucesso`);
      
      // Criar RoleBinding para a Role de edição
      console.log(`[SA-CREATE] Criando rolebinding ${roleBindingName}`);
      await createRoleBinding(roleBindingName, namespace, roleName, name, namespace);
      console.log(`[SA-CREATE] RoleBinding ${roleBindingName} criado com sucesso`);
    } catch (error) {
      console.error(`[SA-CREATE] Erro ao configurar permissões EDIT:`, error.message);
      warnings.push(`Falha ao conceder permissões de edição: ${error.message}`);
    }
  } else if (grantViewAccess) {
    console.log(`[SA-CREATE] Iniciando concessão de permissões VIEW para ${name}`);
    const roleName = `${name}-view-role`;
    const roleBindingName = `${name}-view-binding`;
    
    try {
      // Criar Role de visualização
      console.log(`[SA-CREATE] Criando role ${roleName}`);
      await createRole(roleName, namespace, VIEW_RULES);
      console.log(`[SA-CREATE] Role ${roleName} criada com sucesso`);
      
      // Criar RoleBinding para a Role de visualização
      console.log(`[SA-CREATE] Criando rolebinding ${roleBindingName}`);
      await createRoleBinding(roleBindingName, namespace, roleName, name, namespace);
      console.log(`[SA-CREATE] RoleBinding ${roleBindingName} criado com sucesso`);
    } catch (error) {
      console.error(`[SA-CREATE] Erro ao configurar permissões VIEW:`, error.message);
      warnings.push(`Falha ao conceder permissões de visualização: ${error.message}`);
    }
  }

  // Adicionar avisos ao objeto de resposta, se houver
  if (warnings.length > 0 && createdServiceAccount) {
    createdServiceAccount._roleWarnings = warnings;
    console.log(`[SA-CREATE] ServiceAccount criado com avisos:`, warnings);
  }

  console.log(`[SA-CREATE] Processo de criação concluído para ${name}`);
  return createdServiceAccount;
};

// Delete a service account (user)
const deleteServiceAccount = async (name, namespace = DEFAULT_APP_NAMESPACE) => {
  if (!name) {
    throw new Error('name is required');
  }
  
  if (!namespace) {
    throw new Error('namespace is required');
  }
  
  console.log(`=== Deleting service account ${name} from namespace ${namespace} ===`);
  
  try {
    // First, check if it's a managed resource
    const saOutput = await execKubectl(`get serviceaccount ${name} -n ${namespace} -o json`);
    const sa = JSON.parse(saOutput);
    
    if (!sa.metadata.labels || sa.metadata.labels['app.kubernetes.io/managed-by'] !== 'kube-user-admin') {
      throw new Error(`Service account ${name} is not managed by kube-user-admin. Deletion blocked for safety.`);
    }
    
    // Also delete associated roles and rolebindings managed by this app for this SA
    // Pattern: [SA_NAME]-view-role, [SA_NAME]-edit-role, [SA_NAME]-view-binding, [SA_NAME]-edit-binding
    const rolePrefix = `${name}-`;
    const rolesToDelete = [`${rolePrefix}view-role`, `${rolePrefix}edit-role`];
    const bindingsToDelete = [`${rolePrefix}view-binding`, `${rolePrefix}edit-binding`];

    for (const roleName of rolesToDelete) {
        try {
            await execKubectl(`delete role ${roleName} -n ${namespace} --ignore-not-found=true`);
            console.log(`Deleted role ${roleName} in namespace ${namespace}`);
        } catch (err) {
            console.warn(`Could not delete role ${roleName} in ${namespace}: ${err.message}`);
        }
    }
    for (const bindingName of bindingsToDelete) {
        try {
            await execKubectl(`delete rolebinding ${bindingName} -n ${namespace} --ignore-not-found=true`);
            console.log(`Deleted rolebinding ${bindingName} in namespace ${namespace}`);
        } catch (err) {
            console.warn(`Could not delete rolebinding ${bindingName} in ${namespace}: ${err.message}`);
        }
    }

    const output = await execKubectl(`delete serviceaccount ${name} -n ${namespace}`);
    console.log('Service account deleted:', output);
    
    return { status: 'success', message: output };
  } catch (error) {
    // If SA was not found or not managed, it will throw before this
    console.error(`Error deleting service account ${name} or its associated resources:`, error.message);
    throw error;
  }
};

// Get service account token
const getServiceAccountToken = async (serviceAccountName, namespace = DEFAULT_APP_NAMESPACE) => {
  if (!serviceAccountName || !namespace) {
    throw new Error('serviceAccountName and namespace are required');
  }
  
  console.log(`=== Getting token for service account ${serviceAccountName} in namespace ${namespace} ===`);
  
  try {
    // First, verify that this is a managed service account
    try {
      const saOutput = await execKubectl(`get serviceaccount ${serviceAccountName} -n ${namespace} -o json`);
      const sa = JSON.parse(saOutput);
      
      // Check if the service account already has a token secret
      // Sometimes Kubernetes automatically creates these and we can just use them
      if (sa.secrets && sa.secrets.length > 0) {
        for (const secretRef of sa.secrets) {
          try {
            const secretOutput = await execKubectl(`get secret ${secretRef.name} -n ${namespace} -o json`);
            const secretData = JSON.parse(secretOutput);
            if (secretData.type === 'kubernetes.io/service-account-token' && secretData.data && secretData.data.token) {
              console.log(`Found existing token in secret ${secretRef.name} for SA ${serviceAccountName}`);
              return Buffer.from(secretData.data.token, 'base64').toString();
            }
          } catch (secretErr) {
            console.warn(`Error checking existing secret ${secretRef.name}: ${secretErr.message}`);
            // Continue to next secret or fall back to creating a new one
          }
        }
      }
      
      if (!sa.metadata.labels || sa.metadata.labels['app.kubernetes.io/managed-by'] !== 'kube-user-admin') {
        throw new Error(`Service account ${serviceAccountName} is not managed by kube-user-admin. Token generation blocked for safety.`);
      }
    } catch (error) {
      console.error(`Error verifying service account: ${error.message}`);
      throw error;
    }
    
    const secretName = `${serviceAccountName}-token-${Date.now()}`;
    
    const secret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: secretName,
        namespace: namespace,
        labels: RESOURCE_LABEL,
        annotations: {
          'kubernetes.io/service-account.name': serviceAccountName
        }
      },
      type: 'kubernetes.io/service-account-token'
    };
    
    const tempFile = createTempFile(`${secretName}-secret.yaml`, secret);
    let token = '';

    try {
      // Delete old secrets for this SA
      const oldSecretsOutput = await execKubectl(`get secret -n ${namespace} -l ${MANAGED_BY_LABEL} --field-selector type=kubernetes.io/service-account-token -o json`);
      const oldSecrets = JSON.parse(oldSecretsOutput);
      if (oldSecrets && oldSecrets.items) {
        for (const oldSecret of oldSecrets.items) {
          if (oldSecret.metadata.annotations && oldSecret.metadata.annotations['kubernetes.io/service-account.name'] === serviceAccountName && oldSecret.metadata.name !== secretName) {
            try {
              await execKubectl(`delete secret ${oldSecret.metadata.name} -n ${namespace} --ignore-not-found=true`);
              console.log(`Deleted old token secret ${oldSecret.metadata.name} for SA ${serviceAccountName}`);
            } catch (delError) {
              console.warn(`Could not delete old secret ${oldSecret.metadata.name}: ${delError.message}`);
            }
          }
        }
      }
      
      console.log(`Creating token secret ${secretName} for SA ${serviceAccountName}`);
      await execKubectl(`apply -f ${tempFile}`);
      
      // Retry logic for fetching token
      let attempts = 10; // Increase from 5 to 10 attempts
      const delayBetweenAttempts = 1500; // Increase from 1000 to 1500ms
      let secretDataFromCluster;

      for (let i = 0; i < attempts; i++) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenAttempts));
        console.log(`Attempt ${i + 1}/${attempts} to fetch secret ${secretName} for SA ${serviceAccountName}`);
        try {
          const secretOutput = await execKubectl(`get secret ${secretName} -n ${namespace} -o json`);
          secretDataFromCluster = JSON.parse(secretOutput);
          if (secretDataFromCluster && secretDataFromCluster.data && secretDataFromCluster.data.token) {
            token = Buffer.from(secretDataFromCluster.data.token, 'base64').toString();
            console.log(`Token found for ${secretName} on attempt ${i + 1}`);
            break; // Token found, exit loop
          }
          console.log(`Token not yet populated in secret ${secretName} on attempt ${i + 1}.`);
        } catch (err) {
          console.warn(`Attempt ${i + 1} failed to get or parse secret ${secretName}: ${err.message}`);
          if (i === attempts - 1) { // Last attempt failed
            // Log the secret content if available before throwing
            if (secretDataFromCluster) {
                console.error('Final secret data before failing:', JSON.stringify(secretDataFromCluster));
            }
            throw new Error(`Failed to retrieve populated token secret ${secretName} after ${attempts} attempts. Last error: ${err.message}`);
          }
        }
      }
      
      if (!token) {
        // This case should be covered by the throw in the loop if all attempts fail.
        // However, as a safeguard:
        console.error(`Token data not found in secret ${secretName} after all attempts. Last fetched secret data:`, JSON.stringify(secretDataFromCluster));
        throw new Error(`Token data not populated in secret ${secretName} after ${attempts} attempts.`);
      }

    } catch (error) {
      console.warn(`Error during token secret lifecycle for ${secretName}: ${error.message}`);
      try {
        await execKubectl(`delete secret ${secretName} -n ${namespace} --ignore-not-found=true`);
        console.log(`Cleaned up secret ${secretName} due to error.`);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup secret ${secretName} after error: ${cleanupError.message}`);
      }
      throw error; 
    } finally {
      deleteTempFile(tempFile);
    }
    return token;

  } catch (error) {
    console.error(`Error in getServiceAccountToken for ${serviceAccountName}:`, error.message);
    throw error; 
  }
};

// Generate kubeconfig for a service account
const generateKubeconfig = async (serviceAccountName, namespace = DEFAULT_APP_NAMESPACE) => {
  if (!serviceAccountName || !namespace) {
    throw new Error('serviceAccountName and namespace are required');
  }
  
  console.log(`=== Generating kubeconfig for service account ${serviceAccountName} in namespace ${namespace} ===`);
  
  try {
    // Verify that this is a managed service account
    try {
      const saOutput = await execKubectl(`get serviceaccount ${serviceAccountName} -n ${namespace} -o json`);
      const sa = JSON.parse(saOutput);
      
      if (!sa.metadata.labels || sa.metadata.labels['app.kubernetes.io/managed-by'] !== 'kube-user-admin') {
        throw new Error(`ServiceAccount ${serviceAccountName} is not managed by this application. Kubeconfig generation blocked.`);
      }
    } catch (error) {
      console.error(`Error verifying service account for kubeconfig: ${error.message}`);
      throw error;
    }
    
    // Get token with more robust error handling
    let token;
    try {
      token = await getServiceAccountToken(serviceAccountName, namespace);
      if (!token) {
        throw new Error('Empty token returned');
      }
    } catch (tokenError) {
      console.error(`Error getting token for kubeconfig: ${tokenError.message}`);
      throw new Error(`Failed to retrieve token for kubeconfig generation: ${tokenError.message}`);
    }

    // Get cluster info with fallbacks
    let clusterUrl, clusterName, caData, insecureSkipTlsVerify = false;
    
    try {
      // Obter informações do cluster atual - usando --raw para obter os dados completos, sem omissões
      console.log(`Getting raw cluster info for kubeconfig generation`);
      // Usar --raw é crucial para obter os dados completos do certificado CA, sem omissões
      const clusterInfoOutput = await execKubectl('config view --raw -o json');
      const clusterInfo = JSON.parse(clusterInfoOutput);

      if (!clusterInfo.clusters || clusterInfo.clusters.length === 0) {
        throw new Error('No clusters found in kubectl config view --raw output.');
      }
      
      // Encontrar o cluster atual (o primeiro é o que está sendo usado por padrão)
      const currentCluster = clusterInfo.clusters[0];
      if (!currentCluster || !currentCluster.cluster || !currentCluster.cluster.server) {
        throw new Error('Could not determine cluster server URL from kubectl config view --raw.');
      }
      
      clusterUrl = currentCluster.cluster.server;
      clusterName = currentCluster.name;
      
      // Obter o certificado CA diretamente do cluster atual
      if (currentCluster.cluster['certificate-authority-data']) {
        caData = currentCluster.cluster['certificate-authority-data'];
        console.log(`Successfully extracted certificate-authority-data from raw kubeconfig`);
      } else if (currentCluster.cluster['certificate-authority']) {
        // Se tivermos um arquivo de certificado CA, tentamos ler o conteúdo
        const caPath = currentCluster.cluster['certificate-authority'];
        try {
          console.log(`Reading CA file from path: ${caPath}`);
          const fs = require('fs');
          const caCert = fs.readFileSync(caPath, 'utf8');
          // Convertemos para base64 para incluir no kubeconfig
          caData = Buffer.from(caCert).toString('base64');
          console.log(`Successfully read and encoded CA file`);
        } catch (caReadError) {
          console.error(`Error reading CA file: ${caReadError.message}`);
          // Continuar tentando outros métodos
        }
      } else if (currentCluster.cluster['insecure-skip-tls-verify'] === true) {
        // Se o cluster está configurado para ignorar verificação TLS, mantemos essa configuração
        console.log(`Current cluster is configured with insecure-skip-tls-verify=true`);
        insecureSkipTlsVerify = true;
      }
      
      // Se não encontramos nenhuma configuração de CA no cluster atual, 
      // tentamos procurar em todos os clusters do kubeconfig
      if (!caData && !insecureSkipTlsVerify) {
        console.log(`Searching for CA data in all available clusters...`);
        for (const cluster of clusterInfo.clusters) {
          if (cluster.cluster && cluster.cluster['certificate-authority-data']) {
            caData = cluster.cluster['certificate-authority-data'];
            console.log(`Found certificate-authority-data in cluster ${cluster.name}`);
            break;
          }
        }
      }
    } catch (clusterInfoError) {
      console.error(`Error getting raw cluster info: ${clusterInfoError.message}`);
      // Seguir para os próximos métodos
    }
    
    // Try to get CA data if not yet available from default token secret
    if (!caData && !insecureSkipTlsVerify) {
      try {
        console.log('Attempting to retrieve CA from default-token secret as fallback...');
        const defaultSecretOutput = await execKubectl('get secret -n default -o json $(kubectl get secrets -n default | grep default-token | head -n 1 | awk \'{print $1}\')');
        const defaultSecret = JSON.parse(defaultSecretOutput);
        
        if (defaultSecret && defaultSecret.data && defaultSecret.data['ca.crt']) {
          caData = defaultSecret.data['ca.crt']; // Já está em base64
          console.log(`Successfully retrieved CA data from default token secret`);
        } else {
          console.warn('Could not find ca.crt in default token secret, using insecure-skip-tls-verify');
          insecureSkipTlsVerify = true;
        }
      } catch (caError) {
        console.warn('Could not retrieve CA certificate: ' + caError.message);
        insecureSkipTlsVerify = true;
      }
    }
    
    // Se ainda não temos caData, tentar extrair do kubeconfig atual
    if (!caData && !insecureSkipTlsVerify) {
      try {
        // Tentar um método alternativo para extrair os dados do certificado CA
        // usando o kubectl config view raw com output personalizado
        console.log('Attempting alternative method to extract CA data...');
        const caOutput = await execKubectl('config view --raw -o jsonpath="{.clusters[0].cluster.certificate-authority-data}"');
        
        if (caOutput && caOutput.trim() && !caOutput.includes('null') && !caOutput.includes('DATA+OMITTED')) {
          caData = caOutput.trim();
          console.log(`Successfully extracted CA data using jsonpath`);
        } else {
          console.warn('Alternative method failed to extract valid CA data');
        }
      } catch (extractError) {
        console.warn('Failed to extract CA data with alternative method: ' + extractError.message);
      }
    }
    
    // Final fallback if all methods failed: read CA data from file specified in environment
    if (!caData && !insecureSkipTlsVerify && process.env.CA_CERT_PATH) {
      try {
        console.log(`Attempting to read CA cert from env-specified path: ${process.env.CA_CERT_PATH}`);
        const fs = require('fs');
        const caCert = fs.readFileSync(process.env.CA_CERT_PATH, 'utf8');
        caData = Buffer.from(caCert).toString('base64');
        console.log('Successfully read CA cert from env-specified path');
      } catch (fsError) {
        console.warn(`Failed to read CA cert from ${process.env.CA_CERT_PATH}: ${fsError.message}`);
        insecureSkipTlsVerify = true;
      }
    }
    
    // If we still have no caData, use insecure-skip-tls-verify as last resort
    if (!caData && !insecureSkipTlsVerify) {
      console.warn('All methods to retrieve CA data failed. Using insecure-skip-tls-verify=true');
      insecureSkipTlsVerify = true;
    }

    // Log the final state for debugging
    console.log(`Final CA data status: ${caData ? 'Available' : 'Not available'}, insecureSkipTlsVerify=${insecureSkipTlsVerify}`);
    
    // Extra debug log para verificar o conteúdo do caData (se disponível)
    if (caData) {
      const preview = caData.substring(0, 20) + '...' + caData.substring(caData.length - 20);
      console.log(`CA data preview: ${preview}`);
    }

    const kubeconfig = {
      apiVersion: 'v1',
      kind: 'Config',
      clusters: [{
        name: clusterName,
        cluster: {
          server: clusterUrl,
          ...(caData ? { 'certificate-authority-data': caData } : {}),
          ...(insecureSkipTlsVerify ? { 'insecure-skip-tls-verify': true } : {}),
        }
      }],
      contexts: [{
        name: `${namespace}-${serviceAccountName}-${clusterName}`,
        context: {
          cluster: clusterName,
          user: serviceAccountName,
          namespace: namespace
        }
      }],
      'current-context': `${namespace}-${serviceAccountName}-${clusterName}`,
      users: [{
        name: serviceAccountName,
        user: {
          token: token
        }
      }]
    };
    
    try {
      // Make sure we have the yaml library imported
      if (typeof yaml === 'undefined' || !yaml.dump) {
        console.error('yaml.dump function is not available');
        // Try to require yaml directly as a fallback
        const jsYaml = require('js-yaml');
        return jsYaml.dump(kubeconfig);
      }
      
      // Verificar se temos os dados CA e evitar a exibição de "DATA+OMITTED"
      if (kubeconfig.clusters && kubeconfig.clusters.length > 0 && kubeconfig.clusters[0].cluster) {
        const cluster = kubeconfig.clusters[0].cluster;
        
        // Se não temos dados CA mas temos insecureSkipTlsVerify, garantir que esteja definido
        if (!cluster['certificate-authority-data'] && !cluster['insecure-skip-tls-verify']) {
          console.warn('Neither certificate-authority-data nor insecure-skip-tls-verify is set. Defaulting to insecure-skip-tls-verify=true');
          cluster['insecure-skip-tls-verify'] = true;
        }
        
        // Verificar se o CA data é válido e não contém placeholders
        if (cluster['certificate-authority-data']) {
          const caValue = cluster['certificate-authority-data'];
          if (caValue === 'DATA+OMITTED' || caValue.includes('+OMITTED') || caValue === 'null' || caValue.length < 50) {
            console.warn('Invalid or placeholder certificate-authority-data detected. Using insecure-skip-tls-verify=true instead.');
            delete cluster['certificate-authority-data'];
            cluster['insecure-skip-tls-verify'] = true;
          } else {
            // Se temos um CA válido, garantir que insecure-skip-tls-verify não esteja definido
            if (cluster['insecure-skip-tls-verify']) {
              console.log('Valid certificate-authority-data found, removing insecure-skip-tls-verify');
              delete cluster['insecure-skip-tls-verify'];
            }
          }
        }
      }
      
      // Generate the YAML string from the kubeconfig object
      const yamlString = yaml.dump(kubeconfig);
      if (!yamlString) {
        throw new Error('YAML conversion returned empty string');
      }
      
      return yamlString;
    } catch (yamlError) {
      console.error('Error converting kubeconfig to YAML:', yamlError);
      // As a fallback, return JSON string that can be used by the client
      return JSON.stringify(kubeconfig);
    }
  } catch (error) {
    console.error(`Error generating kubeconfig for ${serviceAccountName}:`, error.message);
    throw error;
  }
};

module.exports = {
  getServiceAccounts,
  createServiceAccount,
  deleteServiceAccount,
  getServiceAccountToken,
  generateKubeconfig,
  VIEW_RULES,
  EDIT_RULES
}; 