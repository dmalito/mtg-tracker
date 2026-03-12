#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Deploying MTG Tracker${NC}"

# Build frontend
echo -e "${BLUE}📦 Building frontend...${NC}"
cd frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed!"
    exit 1
fi

# Deploy frontend to Apache
echo -e "${BLUE}📤 Deploying frontend to /var/www/apps/mtg-tracker...${NC}"
sudo mkdir -p /var/www/apps/mtg-tracker
sudo cp -r dist/* /var/www/apps/mtg-tracker/
sudo chown -R www-data:www-data /var/www/apps/mtg-tracker
sudo chmod -R 755 /var/www/apps/mtg-tracker

# Restart backend with pm2
echo -e "${BLUE}🔄 Restarting backend...${NC}"
cd ../backend
pm2 restart mtg-tracker-backend 2>/dev/null || pm2 start server.js --name mtg-tracker-backend

pm2 save

echo -e "${GREEN}✅ Deploy complete!${NC}"
echo -e "${GREEN}Frontend: http://192.168.0.16/mtg-tracker${NC}"
echo -e "${GREEN}Backend:  http://192.168.0.16:3001/api/health${NC}"
