#!/bin/bash
# Deploy Starbot WebGUI
# Usage: ./deploy.sh
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo -e "${YELLOW}Deploying Starbot WebGUI from $REPO_DIR${NC}"

# Step 1: Install dependencies and build
echo -e "\n${GREEN}1. Building WebGUI...${NC}"
sudo chown -R starbot:starbot "$REPO_DIR"
sudo -u starbot bash -lc "cd '$REPO_DIR' && rm -rf .next && npm ci && npm run build"

if [ ! -f "$REPO_DIR/.next/standalone/server.js" ]; then
    echo -e "${RED}Build failed - .next/standalone/server.js not found${NC}"
    echo -e "${YELLOW}Make sure output: 'standalone' is set in next.config.ts${NC}"
    exit 1
fi
echo -e "${GREEN}Build successful${NC}"

# Step 2: Copy static assets into standalone directory
echo -e "\n${GREEN}2. Publishing static assets...${NC}"
STANDALONE_DIR="$REPO_DIR/.next/standalone"
sudo -u starbot rsync -a "$REPO_DIR/.next/static/" "$STANDALONE_DIR/.next/static/"
sudo -u starbot rsync -a "$REPO_DIR/public/" "$STANDALONE_DIR/public/"
echo -e "${GREEN}Static assets published${NC}"

# Step 3: Install systemd service
echo -e "\n${GREEN}3. Installing systemd service...${NC}"
sudo cp "$REPO_DIR/deploy/starbot-webgui.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable starbot-webgui
echo -e "${GREEN}Service installed${NC}"

# Step 4: Install nginx config
echo -e "\n${GREEN}4. Installing nginx config...${NC}"
if [ -f "$REPO_DIR/deploy/nginx-starbot.cloud.conf" ]; then
    sudo cp "$REPO_DIR/deploy/nginx-starbot.cloud.conf" /etc/nginx/sites-available/starbot.cloud
    # IMPORTANT: nginx includes sites-enabled/*.conf - the symlink MUST end in .conf
    sudo rm -f /etc/nginx/sites-enabled/starbot.cloud
    sudo ln -sf /etc/nginx/sites-available/starbot.cloud /etc/nginx/sites-enabled/starbot.cloud.conf
    if sudo nginx -t; then
        sudo systemctl reload nginx
        echo -e "${GREEN}Nginx config installed and reloaded${NC}"
    else
        echo -e "${RED}Nginx config test failed${NC}"
    fi
fi

# Step 5: Restart
echo -e "\n${GREEN}5. Restarting starbot-webgui...${NC}"
if sudo ss -ltnp | grep -q ':3001 '; then
    echo -e "${YELLOW}Port 3001 in use, releasing stale listener...${NC}"
    sudo fuser -k 3001/tcp || true
    sleep 1
fi
sudo systemctl restart starbot-webgui
sleep 2

if sudo systemctl is-active --quiet starbot-webgui; then
    echo -e "${GREEN}starbot-webgui is running${NC}"
else
    echo -e "${RED}starbot-webgui failed to start${NC}"
    echo -e "${YELLOW}View logs: sudo journalctl -u starbot-webgui -n 50${NC}"
    exit 1
fi

# Step 6: Verify
echo -e "\n${GREEN}6. Verifying...${NC}"
if curl -sf http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}WebGUI responding${NC}"
else
    echo -e "${RED}WebGUI not responding${NC}"
fi

echo -e "\n${GREEN}WebGUI deployment complete!${NC}"
