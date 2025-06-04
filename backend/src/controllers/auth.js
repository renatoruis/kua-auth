const authService = require('../services/auth');
const k8sService = require('../services/kubernetes');

// Authenticate admin user
const login = async (req, res) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ 
      success: false, 
      message: 'Password is required' 
    });
  }
  
  try {
    const result = authService.authenticate(password);
    
    if (!result.success) {
      return res.status(401).json(result);
    }
    
    // Se a autenticação for bem-sucedida, podemos tentar inicializar o namespace
    try {
      await k8sService.initialize();
    } catch (initError) {
      console.warn('Failed to initialize namespace during login:', initError.message);
      // Não bloqueamos o login se a inicialização falhar
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error during authentication:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Authentication failed due to server error',
      error: error.message
    });
  }
};

// Verify token
const verifyToken = async (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided or invalid format'
    });
  }
  
  const token = authHeader.split(' ')[1];
  const result = authService.verifyToken(token);
  
  return res.json(result);
};

module.exports = {
  login,
  verifyToken
}; 