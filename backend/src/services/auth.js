const jwt = require('jsonwebtoken');

// Default admin password if not set in environment
const DEFAULT_ADMIN_PASSWORD = 'admin';
// JWT secret key - in production, should be a strong, randomly generated value
const JWT_SECRET = process.env.JWT_SECRET || 'kube-user-admin-secret';
// Token expiration time
const TOKEN_EXPIRES_IN = '24h';

/**
 * Authenticate admin user with password
 * @param {string} password - Admin password
 * @returns {Object} - Authentication result with token if successful
 */
const authenticate = (password) => {
  const adminPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  
  if (!password) {
    return { 
      success: false, 
      message: 'Password is required' 
    };
  }
  
  if (password !== adminPassword) {
    return { 
      success: false, 
      message: 'Invalid password' 
    };
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { 
      role: 'admin',
      iat: Math.floor(Date.now() / 1000)
    }, 
    JWT_SECRET, 
    { 
      expiresIn: TOKEN_EXPIRES_IN 
    }
  );
  
  return {
    success: true,
    token,
    expiresIn: TOKEN_EXPIRES_IN
  };
};

/**
 * Verify JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object} - Verification result with decoded token if successful
 */
const verifyToken = (token) => {
  if (!token) {
    return { 
      success: false, 
      message: 'No token provided' 
    };
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return {
      success: true,
      decoded
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};

module.exports = {
  authenticate,
  verifyToken
}; 