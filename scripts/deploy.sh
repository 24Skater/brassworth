#!/bin/bash

# Deployment script for Home Asset Keeper
# Usage: ./scripts/deploy.sh [production|development]

set -e

ENVIRONMENT=${1:-development}

echo "🚀 Deploying Home Asset Keeper ($ENVIRONMENT mode)..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Build and start
if [ "$ENVIRONMENT" = "production" ]; then
    echo "📦 Building production image..."
    docker-compose -f docker-compose.prod.yml build
    
    echo "🚀 Starting production services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    echo "✅ Production deployment complete!"
    echo "🌐 Application should be available at https://localhost"
else
    echo "📦 Building development image..."
    docker-compose build
    
    echo "🚀 Starting development services..."
    docker-compose up -d
    
    echo "✅ Development deployment complete!"
    echo "🌐 Application should be available at http://localhost"
fi

# Show status
echo ""
echo "📊 Container status:"
docker-compose ps

echo ""
echo "📝 View logs with: docker-compose logs -f"
echo "🛑 Stop with: docker-compose down"

