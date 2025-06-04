const { verifyToken } = require('../services/auth');

/**
 * Authentication middleware to protect routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authMiddleware = (req, res, next) => {
  // Get the token from the headers
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'No token provided or invalid format. Use Bearer token format.'
    });
  }
  
  // Extract token from the Authorization header
  const token = authHeader.split(' ')[1];
  
  // Verify the token
  const result = verifyToken(token);
  
  if (!result.success) {
    return res.status(401).json({ 
      success: false, 
      message: result.message || 'Failed to authenticate token'
    });
  }
  
  // Token is valid, set the user in the request object
  req.user = result.decoded;
  next();
};

module.exports = authMiddleware; 