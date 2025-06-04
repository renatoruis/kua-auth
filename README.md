# Kubernetes User Admin

A full-stack application for managing Kubernetes users and permissions, generating kubeconfig files, and auditing user activities.

## Features

- Create, list, edit, and delete Kubernetes users (ServiceAccounts)
- Configure user permissions via RBAC (Roles/ClusterRoles + RoleBindings/ClusterRoleBindings)
- Define namespace access for users
- Generate and download kubeconfig files for users
- Manage predefined permission sets
- Basic auditing of user management activities

## Tech Stack

- **Frontend**: Vue.js 3 (Composition API) with TailwindCSS
- **Backend**: Node.js with Express
- **Kubernetes**: Uses @kubernetes/client-node to interact with Kubernetes API

## Prerequisites

- Node.js (v16+)
- Docker and Docker Compose
- A running Kubernetes cluster
- Kubeconfig with admin access

## 🚀 Quick Start Options

### Option 1: Helm Repository (Recommended for Production)

```bash
# Add the Helm repository
helm repo add kua-auth https://renatoruis.github.io/kua-auth
helm repo update

# Install the chart
helm install kua-auth kua-auth/kua-auth \
  --namespace kua-auth \
  --create-namespace

# Access the application
kubectl port-forward -n kua-auth svc/kua-auth-frontend 8080:80
```

Access at: http://localhost:8080

### Option 2: OCI Registry (Helm 3.8+)

```bash
# Install directly from GitHub Container Registry
helm install kua-auth oci://ghcr.io/renatoruis/kua-auth \
  --namespace kua-auth \
  --create-namespace

# Access the application
kubectl port-forward -n kua-auth svc/kua-auth-frontend 8080:80
```

### Option 3: Local Chart (Development)

```bash
# Clone the repository
git clone https://github.com/renatoruis/kua-auth.git
cd kua-auth

# Deploy with Helm
helm install kua-auth ./helm/kua-auth \
  --namespace kua-auth \
  --create-namespace

# Access the application
kubectl port-forward -n kua-auth svc/kua-auth-frontend 8080:80
```

### Option 4: Docker with Pre-built Images

```bash
# 1. Set your GitHub repository
export GITHUB_REPOSITORY=renatoruis/kua-auth

# 2. Copy your kubeconfig
mkdir -p kubeconfig
cp ~/.kube/config kubeconfig/

# 3. Deploy using pre-built images
./scripts/deploy.sh -r $GITHUB_REPOSITORY

# Or manually with docker-compose
docker-compose -f docker-compose.ghcr.yml up -d
```

Access at: http://localhost:8080

### Option 5: Local Development

```bash
# 1. Clone and setup
git clone https://github.com/renatoruis/kua-auth.git
cd kua-auth

# 2. Install dependencies
make install

# 3. Start backend (terminal 1)
make dev-backend

# 4. Start frontend (terminal 2)
make dev-frontend
```

Access at: http://localhost:8080

## 📦 Available Packages

### 🎯 Helm Charts
- **Helm Repository**: https://renatoruis.github.io/kua-auth
- **OCI Registry**: `oci://ghcr.io/renatoruis/kua-auth`

### 🐳 Docker Images
- **Frontend**: `ghcr.io/renatoruis/kua-auth-frontend`
- **Backend**: `ghcr.io/renatoruis/kua-auth-backend`

### Available Tags
- `latest` - Latest stable version from main branch
- `main` - Latest from main branch
- `develop` - Latest from develop branch
- `v1.0.0` - Specific version releases

## 📁 Project Structure

```
kua-auth/
├── .github/workflows/   # GitHub Actions CI/CD
├── helm/                # Helm chart for Kubernetes deployment
│   └── kua-auth/ # Main chart
├── backend/             # Node.js + Express API server
│   ├── src/             # Backend source code
│   │   ├── controllers/ # API controllers
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── server.js    # Entry point
│   ├── Dockerfile       # Backend Docker config
│   └── package.json     # Backend dependencies
├── frontend/            # Vue.js 3 SPA
│   ├── src/             # Frontend source code
│   │   ├── components/  # Reusable UI components
│   │   ├── views/       # Page components
│   │   ├── services/    # API client
│   │   ├── router/      # Vue Router config
│   │   └── assets/      # Static assets
│   ├── Dockerfile       # Frontend Docker config
│   └── package.json     # Frontend dependencies
├── scripts/             # Deployment and utility scripts
├── docker-compose.yml   # Local development
├── docker-compose.ghcr.yml # Production with GHCR images
└── Makefile             # Development helper commands
```

## 🚀 Deployment Options

### 1. Kubernetes (Production)
- **Helm Repository**: Install from public Helm repository
- **OCI Registry**: Install from GitHub Container Registry
- **Local Chart**: Use local chart for development
- **High Availability**: Support for multiple replicas and autoscaling
- **Security**: Network policies and pod security contexts
- **Monitoring**: Health checks and metrics endpoints

See [KUBERNETES_DEPLOYMENT.md](KUBERNETES_DEPLOYMENT.md) for complete guide.

### 2. Docker (Development/Testing)
- **Docker Compose**: Quick local setup with docker-compose
- **Pre-built Images**: Use images from GHCR
- **Custom Images**: Build your own images locally

See [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) for complete guide.

## Setup Instructions (MacOS ARM/M1+)

### Running with Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/renatoruis/kua-auth.git
cd kua-auth
```

2. Copy your Kubernetes admin kubeconfig to the appropriate location:
```bash
mkdir -p backend/config
cp /path/to/your/kubeconfig backend/config/kubeconfig
```

3. Start the application:
```bash
docker-compose up -d
```

4. Access the application at http://localhost:8080

### Running Locally (Development)

1. Install dependencies:
```bash
make install
```

2. Start the backend server (in one terminal):
```bash
make dev-backend
```

3. Start the frontend development server (in another terminal):
```bash
make dev-frontend
```

4. Access the application at http://localhost:8080

### Using the Makefile

The project includes a Makefile to make development easier:

```bash
make help             # Show available commands
make install          # Install all dependencies
make dev-backend      # Run backend in development mode
make dev-frontend     # Run frontend in development mode
make build            # Build Docker images
make docker-run       # Run application with Docker Compose
```

## Implementation Details

### User Management

The application creates Kubernetes ServiceAccounts to represent users. It also sets up appropriate RBAC permissions by creating:

1. Roles or ClusterRoles with specific permissions
2. RoleBindings or ClusterRoleBindings to assign these roles to users

### Kubeconfig Generation

When a user is created, the system:

1. Creates a ServiceAccount
2. Creates a Secret with the ServiceAccount token
3. Generates a kubeconfig file with the token, cluster endpoint, and CA certificate
4. Makes the kubeconfig available for download

### Permission Management

The application provides predefined permission templates:

- **Admin**: Full access to all resources in a namespace
- **Developer**: Access to deployments, pods, services, etc.
- **Viewer**: Read-only access to all resources
- **Logs-Only**: Access to view pod logs only

Users can also be granted cluster-wide permissions using ClusterRoles.

### Audit Logging

The system keeps a log of all user management actions:

- User creation
- User deletion
- Permission changes

Note: This audit log is in-memory and will be reset when the application restarts.

## Security Considerations

This application requires admin access to your Kubernetes cluster. It should only be run in a secure environment and accessed by trusted administrators.

For production use, consider adding:

- Authentication/authorization for the application itself
- Persistent storage for audit logs
- HTTPS for all connections
- Network policies to restrict access

## 📚 Documentation

- [🎯 Helm Chart Repository](https://renatoruis.github.io/kua-auth) - Public Helm repository
- [🚀 Kubernetes Deployment Guide](KUBERNETES_DEPLOYMENT.md) - Complete guide for production deployment
- [🐳 Docker Deployment Guide](DOCKER_DEPLOYMENT.md) - Docker and container deployment
- [⚙️ Helm Chart Documentation](helm/kua-auth/README.md) - Detailed chart configuration
- [🔄 GitHub Actions CI/CD](.github/workflows/build-and-push.yml) - Automated build and deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 