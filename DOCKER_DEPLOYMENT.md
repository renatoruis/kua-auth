# Docker Deployment Guide

Este projeto utiliza GitHub Actions para automaticamente construir e publicar imagens Docker no GitHub Container Registry (GHCR).

## 🚀 Pipeline Automático

O pipeline é executado automaticamente quando:
- **Push** para as branches `main` ou `develop`
- **Pull Request** para a branch `main`
- **Release** é publicado

## 📦 Imagens Publicadas

As seguintes imagens são construídas e publicadas:

### Frontend
- **Registry:** `ghcr.io/[seu-usuario]/kua-auth-frontend`
- **Tecnologia:** Vue.js + Vite
- **Porta:** 80

### Backend
- **Registry:** `ghcr.io/[seu-usuario]/kua-auth-backend`
- **Tecnologia:** Node.js + Express
- **Porta:** 3000

## 🏷️ Tags das Imagens

O pipeline gera automaticamente as seguintes tags:
- `latest` - Para pushes na branch principal
- `main` - Para pushes na branch main
- `develop` - Para pushes na branch develop
- `pr-X` - Para pull requests
- `v1.0.0` - Para releases com versionamento semântico

## 🔧 Como Usar as Imagens

### Puxar as Imagens

```bash
# Frontend
docker pull ghcr.io/[seu-usuario]/kua-auth-frontend:latest

# Backend
docker pull ghcr.io/[seu-usuario]/kua-auth-backend:latest
```

### Executar Localmente

```bash
# Backend
docker run -d \
  --name kube-admin-backend \
  -p 3000:3000 \
  ghcr.io/[seu-usuario]/kua-auth-backend:latest

# Frontend
docker run -d \
  --name kube-admin-frontend \
  -p 8080:80 \
  ghcr.io/[seu-usuario]/kua-auth-frontend:latest
```

### Docker Compose

Você pode usar o `docker-compose.yml` existente, mas atualize as imagens:

```yaml
version: '3.8'
services:
  backend:
    image: ghcr.io/[seu-usuario]/kua-auth-backend:latest
    # ... resto da configuração

  frontend:
    image: ghcr.io/[seu-usuario]/kua-auth-frontend:latest
    # ... resto da configuração
```

## 🔐 Permissões

Para usar as imagens privadas, você precisa fazer login no GHCR:

```bash
# Usando Personal Access Token
echo $GITHUB_TOKEN | docker login ghcr.io -u [seu-usuario] --password-stdin

# Ou usando GitHub CLI
gh auth token | docker login ghcr.io -u [seu-usuario] --password-stdin
```

## 🛠️ Desenvolvimento

### Construir Localmente

```bash
# Frontend
docker build -t kube-admin-frontend ./frontend

# Backend
docker build -t kube-admin-backend ./backend
```

### Testar Pipeline Localmente

Você pode usar [act](https://github.com/nektos/act) para testar o pipeline localmente:

```bash
# Instalar act
brew install act

# Executar o pipeline
act push
```

## 📊 Monitoramento

- Verifique o status do pipeline na aba **Actions** do GitHub
- As imagens ficam disponíveis na aba **Packages** do repositório
- Logs detalhados estão disponíveis em cada execução do workflow

## 🔄 Atualizações

O pipeline inclui cache Docker para acelerar builds subsequentes e gera um resumo detalhado após cada execução com:
- Links para as imagens publicadas
- Comandos para puxar as imagens
- Tags geradas automaticamente 