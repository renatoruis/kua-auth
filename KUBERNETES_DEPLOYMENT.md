# Kubernetes Deployment Guide

Este guia explica como fazer o deploy do Kube User Admin em um cluster Kubernetes usando Helm.

## 📋 Pré-requisitos

- Kubernetes cluster (v1.19+)
- Helm 3.x instalado
- kubectl configurado para acessar o cluster
- Permissões de cluster-admin no Kubernetes

## 🚀 Quick Start

### Método 1: Repositório Helm (Recomendado)

```bash
# 1. Adicionar o repositório Helm
helm repo add kube-user-admin https://renatoruis.github.io/kube-user-admin
helm repo update

# 2. Instalar o chart
helm install kube-user-admin kube-user-admin/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace

# 3. Verificar o status
kubectl get pods -n kube-user-admin
```

### Método 2: OCI Registry (Helm 3.8+)

```bash
# 1. Instalar diretamente do GitHub Container Registry
helm install kube-user-admin oci://ghcr.io/renatoruis/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace

# 2. Verificar o status
kubectl get pods -n kube-user-admin
```

### Método 3: Chart Local (Desenvolvimento)

```bash
# 1. Clone o repositório
git clone https://github.com/renatoruis/kube-user-admin.git
cd kube-user-admin

# 2. Instalar o chart
helm install kube-user-admin ./helm/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace

# 3. Verificar o status
kubectl get pods -n kube-user-admin
```

### Acessar a aplicação

```bash
# Port-forward para acessar localmente
kubectl port-forward -n kube-user-admin svc/kube-user-admin-frontend 8080:80

# Acesse: http://localhost:8080
```

## ⚙️ Configuração Avançada

### Valores Customizados

Crie um arquivo `values-custom.yaml`:

```yaml
# values-custom.yaml
image:
  repository: renatoruis/kube-user-admin
  tag: "v1.0.0"

backend:
  env:
    ADMIN_PASSWORD: "seu-password-seguro"
    JWT_SECRET: "seu-jwt-secret-super-seguro"
    DEFAULT_NAMESPACE: "meu-namespace"

ingress:
  enabled: true
  className: "nginx"
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rewrite-target: /$2
  hosts:
    - host: kube-admin.exemplo.com
      paths:
        - path: /()(.*)
          pathType: Prefix
          service: frontend
        - path: /(api)(.*)
          pathType: Prefix
          service: backend
  tls:
    - secretName: kube-admin-tls
      hosts:
        - kube-admin.exemplo.com

resources:
  backend:
    limits:
      cpu: 1000m
      memory: 1Gi
    requests:
      cpu: 500m
      memory: 512Mi
  frontend:
    limits:
      cpu: 500m
      memory: 512Mi
    requests:
      cpu: 200m
      memory: 256Mi
```

Instalar com configurações customizadas:

```bash
# Usando repositório Helm
helm install kube-user-admin kube-user-admin/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace \
  --values values-custom.yaml

# Ou usando OCI registry
helm install kube-user-admin oci://ghcr.io/renatoruis/kube-user-admin \
  --namespace kube-user-admin \
  --create-namespace \
  --values values-custom.yaml
```

### Configuração de RBAC

O chart cria automaticamente:
- ServiceAccount
- ClusterRole com permissões necessárias
- ClusterRoleBinding

Permissões incluídas:
- Gerenciar ServiceAccounts e Secrets
- Gerenciar Roles, RoleBindings, ClusterRoles, ClusterRoleBindings
- Listar e criar Namespaces
- Visualizar Nodes

## 🔧 Configurações Específicas

### 1. Usando Imagens Privadas

```yaml
global:
  imagePullSecrets:
    - name: ghcr-secret

# Criar o secret
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=seu-usuario \
  --docker-password=seu-token \
  --namespace=kube-user-admin
```

### 2. Configuração de Storage

```yaml
global:
  storageClass: "fast-ssd"

# Para persistência de dados (se necessário no futuro)
persistence:
  enabled: true
  size: 10Gi
  storageClass: "fast-ssd"
```

### 3. High Availability

```yaml
backend:
  replicaCount: 3

frontend:
  replicaCount: 2

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 70

podDisruptionBudget:
  enabled: true
  minAvailable: 1
```

## 🔒 Segurança

### 1. Network Policies

```yaml
# network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: kube-user-admin-netpol
  namespace: kube-user-admin
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: kube-user-admin
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
  - from: []
    ports:
    - protocol: TCP
      port: 3000
    - protocol: TCP
      port: 80
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 443  # HTTPS para API do Kubernetes
    - protocol: TCP
      port: 6443 # API Server
```

### 2. Pod Security Standards

```yaml
podSecurityContext:
  runAsNonRoot: true
  runAsUser: 1000
  fsGroup: 1000
  seccompProfile:
    type: RuntimeDefault

securityContext:
  allowPrivilegeEscalation: false
  readOnlyRootFilesystem: true
  capabilities:
    drop:
    - ALL
```

## 📊 Monitoramento

### 1. Health Checks

O chart inclui probes padrão:

```yaml
# Backend health endpoint
livenessProbe:
  httpGet:
    path: /health
    port: 3000
readinessProbe:
  httpGet:
    path: /health
    port: 3000

# Frontend health endpoint
livenessProbe:
  httpGet:
    path: /
    port: 80
```

### 2. Metrics (Opcional)

Se você tiver Prometheus instalado:

```yaml
# values.yaml
serviceMonitor:
  enabled: true
  namespace: monitoring
  labels:
    release: prometheus
```

## 🔄 Operações

### Upgrade

```bash
# Atualizar repositório
helm repo update

# Upgrade para nova versão (repositório Helm)
helm upgrade kube-user-admin kube-user-admin/kube-user-admin \
  --namespace kube-user-admin \
  --values values-custom.yaml

# Ou upgrade usando OCI registry
helm upgrade kube-user-admin oci://ghcr.io/renatoruis/kube-user-admin \
  --namespace kube-user-admin \
  --values values-custom.yaml

# Ver histórico
helm history kube-user-admin -n kube-user-admin

# Rollback se necessário
helm rollback kube-user-admin 1 -n kube-user-admin
```

### Backup

```bash
# Backup da configuração
kubectl get all,secrets,configmaps -n kube-user-admin -o yaml > backup-kube-user-admin.yaml

# Backup do Helm release
helm get values kube-user-admin -n kube-user-admin > backup-values.yaml
```

### Logs

```bash
# Ver logs do backend
kubectl logs -n kube-user-admin -l app.kubernetes.io/component=backend -f

# Ver logs do frontend
kubectl logs -n kube-user-admin -l app.kubernetes.io/component=frontend -f

# Ver todos os logs
kubectl logs -n kube-user-admin -l app.kubernetes.io/name=kube-user-admin -f
```

### Debug

```bash
# Verificar recursos
kubectl get all -n kube-user-admin

# Descrever pods com problemas
kubectl describe pod -n kube-user-admin -l app.kubernetes.io/component=backend

# Verificar RBAC
kubectl auth can-i --as=system:serviceaccount:kube-user-admin:kube-user-admin create serviceaccounts

# Testar conectividade
kubectl run debug --image=nicolaka/netshoot -it --rm --restart=Never -n kube-user-admin
```

## 🗑️ Desinstalação

```bash
# Remover o release
helm uninstall kube-user-admin -n kube-user-admin

# Remover namespace (cuidado: remove todos os recursos)
kubectl delete namespace kube-user-admin

# Limpar CRDs se houver
kubectl delete clusterrole kube-user-admin
kubectl delete clusterrolebinding kube-user-admin
```

## 🚨 Troubleshooting

### Problema: Pods não iniciam

```bash
# Verificar events
kubectl get events -n kube-user-admin --sort-by='.lastTimestamp'

# Verificar logs de init
kubectl logs -n kube-user-admin <pod-name> -c <init-container>
```

### Problema: RBAC negado

```bash
# Verificar ServiceAccount
kubectl get sa -n kube-user-admin

# Verificar ClusterRoleBinding
kubectl describe clusterrolebinding kube-user-admin

# Testar permissões
kubectl auth can-i create serviceaccounts --as=system:serviceaccount:kube-user-admin:kube-user-admin
```

### Problema: Ingress não funciona

```bash
# Verificar ingress controller
kubectl get pods -n ingress-nginx

# Verificar ingress
kubectl describe ingress kube-user-admin -n kube-user-admin

# Verificar certificados (se TLS)
kubectl describe certificate kube-admin-tls -n kube-user-admin
```

### Problema: Chart não encontrado

```bash
# Verificar se o repositório foi adicionado
helm repo list

# Atualizar repositórios
helm repo update

# Procurar o chart
helm search repo kube-user-admin

# Verificar se o OCI registry está acessível
helm show chart oci://ghcr.io/renatoruis/kube-user-admin
```

## 📝 Notas Importantes

1. **Segurança**: Esta aplicação requer permissões de cluster-admin. Use apenas em ambientes confiáveis.

2. **Backup**: Sempre faça backup antes de atualizações importantes.

3. **Monitoramento**: Configure alertas para falhas de autenticação e operações críticas.

4. **Network**: Use Network Policies em ambientes de produção.

5. **Secrets**: Use ferramentas como Sealed Secrets ou External Secrets para gerenciar credenciais.

6. **Repositório Helm**: O repositório oficial está disponível em https://renatoruis.github.io/kube-user-admin

7. **OCI Registry**: Para Helm 3.8+, você pode usar o OCI registry diretamente sem adicionar repositório. 