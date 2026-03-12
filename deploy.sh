#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

DEPLOY_DIR="/var/www/apps/mtg-tracker"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "${BLUE}🚀 Deploying MTG Tracker${NC}"

# Build frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd "$SCRIPT_DIR/frontend"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed!${NC}"
    exit 1
fi

# Deploy full app (backend + built frontend) to /var/www/apps/mtg-tracker
echo -e "${BLUE}📤 Deploying to $DEPLOY_DIR...${NC}"
sudo mkdir -p "$DEPLOY_DIR/backend"
sudo mkdir -p "$DEPLOY_DIR/frontend"

# Copy backend (excluding node_modules)
sudo rsync -a --delete \
    --exclude='node_modules' \
    --exclude='mtg.db' \
    "$SCRIPT_DIR/backend/" "$DEPLOY_DIR/backend/"

# Copy built frontend
sudo rsync -a --delete \
    "$SCRIPT_DIR/frontend/dist/" "$DEPLOY_DIR/frontend/"

# Install backend dependencies in deploy dir (if needed)
sudo bash -c "cd $DEPLOY_DIR/backend && npm install --omit=dev"

# Fix ownership
sudo chown -R dmalito:dmalito "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

# Start/restart backend with pm2 from deploy dir
echo -e "${BLUE}🔄 Restarting backend...${NC}"
cd "$DEPLOY_DIR/backend"
pm2 restart mtg-tracker-backend 2>/dev/null || pm2 start server.js --name mtg-tracker-backend

pm2 save

echo -e "${GREEN}✅ Deploy complete!${NC}"
echo -e "${GREEN}Frontend: http://192.168.0.16/mtg-tracker${NC}"
echo -e "${GREEN}Backend:  http://192.168.0.16:3002/api/health${NC}"
