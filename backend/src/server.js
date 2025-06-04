const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const configRoutes = require('./routes/configs');

// Import middleware
const authMiddleware = require('./middleware/auth');

// Import services
const kubernetesService = require('./services/kubernetes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Public routes
app.use('/api/auth', authRoutes);

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Protected routes - require authentication
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/roles', authMiddleware, roleRoutes);
app.use('/api/configs', authMiddleware, configRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An error occurred',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Initialize and start the server
(async () => {
  try {
    // Initialize Kubernetes resources
    const initResult = await kubernetesService.initialize();
    if (initResult.success) {
      console.log(`Kubernetes User Admin initialized successfully in namespace: ${initResult.namespace}`);
    } else {
      console.warn(`Kubernetes User Admin initialization warning: ${initResult.error}`);
      console.warn('The application may have limited functionality');
    }
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Admin password: ${process.env.ADMIN_PASSWORD || 'admin'} (default)`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
})(); 