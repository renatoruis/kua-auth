#!/bin/bash

# Deploy script for Kube User Admin using GHCR images
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
GITHUB_REPOSITORY=${GITHUB_REPOSITORY:-""}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
COMPOSE_FILE="docker-compose.ghcr.yml"

print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -r, --repository REPO    GitHub repository (e.g., username/kua-auth)"
    echo "  -t, --tag TAG           Image tag (default: latest)"
    echo "  -f, --file FILE         Docker compose file (default: docker-compose.ghcr.yml)"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 -r renatoruis/kua-auth -t v1.0.0"
    echo "  $0 --repository myuser/kua-auth --tag main"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--repository)
            GITHUB_REPOSITORY="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -h|--help)
            print_usage
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            print_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$GITHUB_REPOSITORY" ]]; then
    echo -e "${RED}Error: GitHub repository is required${NC}"
    echo "Use -r or --repository to specify the repository"
    echo "Example: -r username/kua-auth"
    exit 1
fi

# Check if docker-compose file exists
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}Error: Docker compose file '$COMPOSE_FILE' not found${NC}"
    exit 1
fi

echo -e "${BLUE}🚀 Deploying Kube User Admin${NC}"
echo -e "${YELLOW}Repository: ${GITHUB_REPOSITORY}${NC}"
echo -e "${YELLOW}Tag: ${IMAGE_TAG}${NC}"
echo -e "${YELLOW}Compose file: ${COMPOSE_FILE}${NC}"
echo ""

# Export environment variables
export GITHUB_REPOSITORY
export IMAGE_TAG

# Check if user is logged in to GHCR
echo -e "${BLUE}🔐 Checking GHCR authentication...${NC}"
if ! docker pull ghcr.io/${GITHUB_REPOSITORY}-backend:${IMAGE_TAG} --quiet > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Not authenticated to GHCR or image not found${NC}"
    echo "Please login to GHCR first:"
    echo "  echo \$GITHUB_TOKEN | docker login ghcr.io -u your-username --password-stdin"
    echo ""
    echo "Or make sure the images exist and are public"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest images
echo -e "${BLUE}📦 Pulling latest images...${NC}"
docker-compose -f "$COMPOSE_FILE" pull

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose -f "$COMPOSE_FILE" down

# Start services
echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose -f "$COMPOSE_FILE" up -d

# Show status
echo ""
echo -e "${GREEN}✅ Deployment completed!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo -e "${BLUE}🌐 Access URLs:${NC}"
echo -e "Frontend: ${GREEN}http://localhost:8080${NC}"
echo -e "Backend:  ${GREEN}http://localhost:3000${NC}"

echo ""
echo -e "${BLUE}📝 Useful commands:${NC}"
echo "  View logs:    docker-compose -f $COMPOSE_FILE logs -f"
echo "  Stop:         docker-compose -f $COMPOSE_FILE down"
echo "  Restart:      docker-compose -f $COMPOSE_FILE restart" 