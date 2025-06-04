# Kube User Admin Helm Chart

This Helm chart deploys Kube User Admin, a full-stack application for managing Kubernetes users and permissions.

## TL;DR

```bash
helm install kube-user-admin ./helm/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace
```

## Introduction

This chart bootstraps a Kube User Admin deployment on a Kubernetes cluster using the Helm package manager.

## Prerequisites

- Kubernetes 1.19+
- Helm 3.x
- Cluster-admin permissions

## Installing the Chart

To install the chart with the release name `my-release`:

```bash
helm install my-release ./helm/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace
```

The command deploys Kube User Admin on the Kubernetes cluster in the default configuration. The [Parameters](#parameters) section lists the parameters that can be configured during installation.

## Uninstalling the Chart

To uninstall/delete the `my-release` deployment:

```bash
helm uninstall my-release --namespace kube-user-admin
```

The command removes all the Kubernetes components associated with the chart and deletes the release.

## Parameters

### Global Parameters

| Name                               | Description                                     | Value |
| ---------------------------------- | ----------------------------------------------- | ----- |
| `global.imagePullSecrets`          | Global Docker registry secret names as an array | `[]`  |
| `global.storageClass`              | Global StorageClass for Persistent Volume(s)   | `""`  |

### Common Parameters

| Name                               | Description                                     | Value                           |
| ---------------------------------- | ----------------------------------------------- | ------------------------------- |
| `image.registry`                   | Image registry                                  | `ghcr.io`                       |
| `image.repository`                 | Image repository                                | `renatoruis/kube-user-admin`    |
| `image.tag`                        | Image tag                                       | `latest`                        |
| `image.pullPolicy`                 | Image pull policy                               | `IfNotPresent`                  |

### ServiceAccount Parameters

| Name                               | Description                                     | Value  |
| ---------------------------------- | ----------------------------------------------- | ------ |
| `serviceAccount.create`            | Create ServiceAccount                           | `true` |
| `serviceAccount.name`              | ServiceAccount name                             | `""`   |
| `serviceAccount.annotations`       | ServiceAccount annotations                      | `{}`   |

### RBAC Parameters

| Name                               | Description                                     | Value  |
| ---------------------------------- | ----------------------------------------------- | ------ |
| `rbac.create`                      | Create RBAC resources                          | `true` |
| `rbac.rules`                       | RBAC rules for the ClusterRole                | See values.yaml |

### Backend Parameters

| Name                               | Description                                     | Value      |
| ---------------------------------- | ----------------------------------------------- | ---------- |
| `backend.enabled`                  | Enable backend deployment                       | `true`     |
| `backend.replicaCount`             | Number of backend replicas                      | `1`        |
| `backend.image.repository`         | Backend image repository                        | `backend`  |
| `backend.image.tag`                | Backend image tag                               | `latest`   |
| `backend.service.type`             | Backend service type                           | `ClusterIP` |
| `backend.service.port`             | Backend service port                           | `3000`     |
| `backend.env.ADMIN_PASSWORD`       | Admin password                                 | `admin`    |
| `backend.env.JWT_SECRET`           | JWT secret key                                 | `kube-user-admin-secret-change-in-production` |
| `backend.resources.limits.cpu`     | Backend CPU limit                              | `500m`     |
| `backend.resources.limits.memory`  | Backend memory limit                           | `512Mi`    |

### Frontend Parameters

| Name                               | Description                                     | Value      |
| ---------------------------------- | ----------------------------------------------- | ---------- |
| `frontend.enabled`                 | Enable frontend deployment                      | `true`     |
| `frontend.replicaCount`            | Number of frontend replicas                     | `1`        |
| `frontend.image.repository`        | Frontend image repository                       | `frontend` |
| `frontend.image.tag`               | Frontend image tag                              | `latest`   |
| `frontend.service.type`            | Frontend service type                          | `ClusterIP` |
| `frontend.service.port`            | Frontend service port                          | `80`       |
| `frontend.resources.limits.cpu`    | Frontend CPU limit                             | `200m`     |
| `frontend.resources.limits.memory` | Frontend memory limit                          | `256Mi`    |

### Ingress Parameters

| Name                               | Description                                     | Value   |
| ---------------------------------- | ----------------------------------------------- | ------- |
| `ingress.enabled`                  | Enable ingress controller resource             | `false` |
| `ingress.className`                | IngressClass that will be be used             | `""`    |
| `ingress.annotations`              | Ingress annotations                            | `{}`    |
| `ingress.hosts`                    | Ingress hostnames configuration                | See values.yaml |
| `ingress.tls`                      | Ingress TLS configuration                      | `[]`    |

### Autoscaling Parameters

| Name                                        | Description                                     | Value   |
| ------------------------------------------- | ----------------------------------------------- | ------- |
| `autoscaling.enabled`                       | Enable autoscaling                             | `false` |
| `autoscaling.minReplicas`                   | Minimum number of replicas                     | `1`     |
| `autoscaling.maxReplicas`                   | Maximum number of replicas                     | `100`   |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU utilization percentage             | `80`    |

## Configuration Examples

### Basic Installation

```bash
helm install kube-user-admin ./helm/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace
```

### Production Installation with Custom Values

```yaml
# values-prod.yaml
image:
  tag: "v1.0.0"

backend:
  replicaCount: 3
  env:
    ADMIN_PASSWORD: "secure-password-here"
    JWT_SECRET: "your-super-secret-jwt-key"
  resources:
    limits:
      cpu: 1000m
      memory: 1Gi

frontend:
  replicaCount: 2

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: kube-admin.yourdomain.com
      paths:
        - path: /
          pathType: Prefix
          service: frontend
        - path: /api
          pathType: Prefix
          service: backend
  tls:
    - secretName: kube-admin-tls
      hosts:
        - kube-admin.yourdomain.com

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
```

```bash
helm install kube-user-admin ./helm/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace \
  --values values-prod.yaml
```

### High Availability Setup

```yaml
# values-ha.yaml
backend:
  replicaCount: 3

frontend:
  replicaCount: 3

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

podDisruptionBudget:
  enabled: true
  minAvailable: 2

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
    - weight: 100
      podAffinityTerm:
        labelSelector:
          matchExpressions:
          - key: app.kubernetes.io/name
            operator: In
            values:
            - kube-user-admin
        topologyKey: kubernetes.io/hostname
```

## Upgrading

To upgrade the release:

```bash
helm upgrade kube-user-admin ./helm/kube-user-admin \
  --namespace kube-user-admin \
  --values values-prod.yaml
```

## Security Considerations

1. **Change default passwords**: Always change the default admin password in production
2. **Use TLS**: Enable TLS/SSL for ingress in production environments
3. **RBAC**: Review and customize RBAC permissions as needed
4. **Network Policies**: Consider implementing network policies for additional security
5. **Image scanning**: Scan images for vulnerabilities before deployment

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n kube-user-admin
```

### View logs
```bash
kubectl logs -n kube-user-admin -l app.kubernetes.io/name=kube-user-admin
```

### Debug RBAC issues
```bash
kubectl auth can-i create serviceaccounts --as=system:serviceaccount:kube-user-admin:kube-user-admin
```

## License

This Helm chart is licensed under the MIT License. 

God is Good!