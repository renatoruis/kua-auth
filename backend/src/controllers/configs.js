const k8sService = require('../services/kubernetes');

// Helper function to set cache control headers
const setCacheControlHeaders = (res) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Expires': '-1',
    'Pragma': 'no-cache'
  });
};

// Generate kubeconfig for a user
const generateKubeconfig = async (req, res) => {
  const { namespace, name } = req.params;
  
  // Validate required parameters
  if (!name) {
    return res.status(400).json({ message: 'User name is required' });
  }
  
  try {
    // O serviço já valida se o usuário é gerenciado pelo nosso aplicativo
    const kubeconfig = await k8sService.generateKubeconfig(name, namespace || k8sService.DEFAULT_APP_NAMESPACE);
    
    // Set response headers for download
    res.set({
      'Content-Type': 'application/x-yaml',
      'Content-Disposition': `attachment; filename=${name}-kubeconfig.yaml`
    });
    
    res.send(kubeconfig);
  } catch (error) {
    console.error(`Error generating kubeconfig for user ${name}:`, error);
    res.status(500).json({ 
      message: `Failed to generate kubeconfig for user ${name}`, 
      error: error.message 
    });
  }
};

// Get namespaces
const getNamespaces = async (req, res) => {
  try {
    // Usar o serviço refatorado que agora é mais robusto
    const namespaces = await k8sService.getNamespaces();
    
    // Extrair apenas os nomes dos namespaces
    const namespaceNames = namespaces.map(ns => ns.metadata.name);
    
    // Transformar em formato compatível com o frontend (objeto com propriedade 'items')
    const namespaceData = {
      items: namespaceNames
    };
    
    console.log(`Found ${namespaces.length} namespaces`);
    console.log('Returning namespace names:', namespaceNames);
    
    // Set cache control headers to prevent 304 responses
    setCacheControlHeaders(res);
    
    res.status(200).json(namespaceData);
  } catch (error) {
    console.error('Error getting namespaces:', error);
    res.status(500).json({ message: 'Failed to get namespaces', error: error.message });
  }
};

// Get cluster info
const getClusterInfo = async (req, res) => {
  try {
    // Agora inicializa o namespace padrão automaticamente
    const clusterInfo = await k8sService.getClusterInfo();
    const namespaces = await k8sService.getNamespaces();
    
    // Set cache control headers to prevent 304 responses
    setCacheControlHeaders(res);
    
    res.status(200).json({
      clusterInfo,
      namespaces: namespaces.map(ns => ns.metadata.name)
    });
  } catch (error) {
    console.error('Error getting cluster info:', error);
    res.status(500).json({ message: 'Failed to get cluster info', error: error.message });
  }
};

// Get nodes
const getNodes = async (req, res) => {
  try {
    const nodes = await k8sService.getNodes();
    
    // Set cache control headers to prevent 304 responses
    setCacheControlHeaders(res);
    
    res.status(200).json(nodes);
  } catch (error) {
    console.error('Error getting nodes:', error);
    res.status(500).json({ message: 'Failed to get nodes', error: error.message });
  }
};

module.exports = {
  generateKubeconfig,
  getNamespaces,
  getClusterInfo,
  getNodes,
}; 