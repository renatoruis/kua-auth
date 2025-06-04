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

## Project Structure

```
kube-user-admin/
├── backend/         # Node.js + Express API server
│   ├── src/         # Backend source code
│   │   ├── controllers/  # API controllers
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   └── server.js     # Entry point
│   ├── Dockerfile        # Backend Docker config
│   └── package.json      # Backend dependencies
├── frontend/        # Vue.js 3 SPA
│   ├── src/         # Frontend source code
│   │   ├── components/   # Reusable UI components
│   │   ├── views/        # Page components
│   │   ├── services/     # API client
│   │   ├── router/       # Vue Router config
│   │   └── assets/       # Static assets
│   ├── Dockerfile        # Frontend Docker config
│   └── package.json      # Frontend dependencies
├── docker-compose.yml    # Docker Compose config
└── Makefile              # Development helper commands
```

## Setup Instructions (MacOS ARM/M1+)

### Running with Docker Compose

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kube-user-admin.git
cd kube-user-admin
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