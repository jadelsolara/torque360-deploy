#!/bin/bash
# ============================================
# TORQUE 360 — Deploy Script
# Usage: ./deploy.sh [staging|production]
# ============================================
set -euo pipefail

ENVIRONMENT=${1:-staging}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="docker-compose.prod.yml"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[DEPLOY]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; }

log "============================================"
log "TORQUE 360 — Deploying to $ENVIRONMENT"
log "Timestamp: $TIMESTAMP"
log "============================================"

cd "$PROJECT_ROOT"

# Validate environment file
if [ ! -f ".env" ]; then
    error ".env file not found! Copy .env.example to .env and configure it."
    exit 1
fi

# Validate compose file
if [ ! -f "$COMPOSE_FILE" ]; then
    error "$COMPOSE_FILE not found!"
    exit 1
fi

# Pull latest code
log "Pulling latest code from main..."
git pull origin main

# Build images
log "Building Docker images..."
docker compose -f "$COMPOSE_FILE" build --no-cache

# Create backup before deploying
log "Creating pre-deploy database backup..."
if docker compose -f "$COMPOSE_FILE" ps postgres | grep -q "running"; then
    BACKUP_FILE="/data/backups/pre_deploy_${TIMESTAMP}.sql.gz"
    mkdir -p /data/backups
    docker compose -f "$COMPOSE_FILE" exec -T postgres pg_dump -U torque torque360 | gzip > "$BACKUP_FILE" 2>/dev/null && \
        log "Backup saved: $BACKUP_FILE" || \
        warn "Backup failed (database might not exist yet)"
else
    warn "PostgreSQL not running — skipping pre-deploy backup"
fi

# Run database migrations
log "Running database migrations..."
docker compose -f "$COMPOSE_FILE" run --rm api npx typeorm migration:run -d dist/database/data-source.js 2>/dev/null || \
    warn "No migrations to run or migration runner not configured"

# Deploy containers
log "Deploying containers..."
docker compose -f "$COMPOSE_FILE" up -d --remove-orphans

# Wait for services to be ready
log "Waiting for services to start..."
sleep 15

# Health check
log "Running health check..."
HEALTH_RETRIES=5
HEALTH_OK=false

for i in $(seq 1 $HEALTH_RETRIES); do
    if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
        HEALTH_OK=true
        break
    fi
    warn "Health check attempt $i/$HEALTH_RETRIES failed, retrying in 5s..."
    sleep 5
done

if [ "$HEALTH_OK" = true ]; then
    log "============================================"
    log "TORQUE 360 deployed successfully to $ENVIRONMENT!"
    log "============================================"

    # Show running containers
    docker compose -f "$COMPOSE_FILE" ps

    # Show health check response
    log "Health check response:"
    curl -s http://localhost:3001/api/health | python3 -m json.tool 2>/dev/null || \
        curl -s http://localhost:3001/api/health
else
    error "============================================"
    error "HEALTH CHECK FAILED after $HEALTH_RETRIES attempts!"
    error "============================================"

    # Show container logs for debugging
    error "API container logs:"
    docker compose -f "$COMPOSE_FILE" logs --tail=50 api

    exit 1
fi
