#!/bin/bash
# ==============================================================================
# Zaruda Backend API VPS Deployment & Hardening Script
# ==============================================================================
# Target OS: Ubuntu 22.04 LTS or newer
# Runs Node.js app via PM2 cluster mode under Nginx/Cloudflare reverse proxy
# ==============================================================================

set -e

echo "======================================================================"
echo "🚀 Zaruda Backend API: Initializing Production VPS Setup..."
echo "======================================================================"

# 1. Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install essential dependencies
echo "🛠️ Installing system dependencies..."
sudo apt-get install -y curl git build-essential software-properties-common nginx fail2ban

# 3. Install Node.js v20 LTS
echo "🟢 Installing Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
echo "🔍 Verifying Node.js and NPM versions:"
node -v
npm -v

# 4. Install PM2 (Process Manager 2) globally
echo "⚙️ Installing PM2..."
sudo npm install -y -g pm2

# 5. Configure UFW Firewall (Port Hardening)
echo "🛡️ Hardening ports via UFW..."
# CRITICAL: Allow SSH (Port 22) first to avoid getting locked out!
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Enable firewall
echo "y" | sudo ufw enable
sudo ufw status verbose

# 6. PM2 Cluster Mode Startup
echo "🔄 Starting API server with PM2 in cluster mode..."
# Make sure we are in the server repository root directory when running this script
if [ -f "ecosystem.config.js" ]; then
    pm2 start ecosystem.config.js --env production
    # Set up PM2 to start on system boot
    pm2 save
    sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
else
    echo "⚠️ Warning: ecosystem.config.js not found in current directory. Skip PM2 startup."
fi

# 7. Configure Nginx Reverse Proxy (Optional helper)
echo "🌐 Configuring local Nginx block..."
NGINX_CONF_PATH="/etc/nginx/sites-available/zaruda-api"
sudo tee $NGINX_CONF_PATH > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name api.zarudatech.com;

    location / {
        proxy_pass http://localhost:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable Nginx config and restart
if [ -f "$NGINX_CONF_PATH" ]; then
    sudo ln -sf $NGINX_CONF_PATH /etc/nginx/sites-enabled/
    sudo rm -f /etc/nginx/sites-enabled/default
    sudo nginx -t
    sudo systemctl restart nginx
    echo "✅ Nginx reverse proxy configured successfully."
fi

# 8. Let's Encrypt SSL Configuration (Interactive prompt warning)
echo "🔒 SSL Setup Option:"
echo "To obtain Let's Encrypt SSL certificate, run:"
echo "  sudo apt-get install -y certbot python3-certbot-nginx"
echo "  sudo certbot --nginx -d api.zarudatech.com"

echo "======================================================================"
echo "✅ VPS Server Hardening and Deployment Setup Completed!"
echo "======================================================================"
