#!/usr/bin/env bash
# ==============================================================================
# Zaruda Level 2 Infrastructure Hardening - Automated Production VPS Installer
# ==============================================================================
# OS Target: Ubuntu 20.04 / 22.04 / 24.04 LTS
# Usage: sudo bash setup_vps_hardening.sh
# ==============================================================================

set -euo pipefail

echo "🚀 Starting Zaruda Level 2 Production VPS Hardening Setup..."

# 1. Update OS Packages
echo "📦 [1/6] Updating system packages..."
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git build-essential ufw ca-certificates gnupg

# 2. Install Node.js v20 LTS
echo "🟢 [2/6] Installing Node.js 20 LTS & PM2..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# Install PM2 Process Manager globally
npm install -g pm2 cloudflared

# 3. Configure Port Hardening (UFW Firewall)
echo "🛡️  [3/6] Setting up UFW firewall rules..."
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Cloudflare / Certbot)'
ufw allow 443/tcp comment 'HTTPS (Cloudflare SSL)'
ufw --force enable

# 4. Create App User & Directory Structure
echo "📁 [4/6] Provisioning application directory /var/www/zaruda-api..."
mkdir -p /var/www/zaruda-api
mkdir -p /var/www/zaruda-api/logs

if ! id "zaruda" &>/dev/null; then
  useradd -m -s /bin/bash zaruda
fi
chown -R zaruda:zaruda /var/www/zaruda-api

# 5. PM2 Systemd Startup Configuration
echo "⚙️  [5/6] Configuring PM2 auto-boot..."
env PATH=$PATH:/usr/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u zaruda --hp /home/zaruda || true

# 6. Final Status Summary
echo ""
echo "=============================================================================="
echo "✅ VPS HARDENING BASE SETUP COMPLETE!"
echo "=============================================================================="
echo "Next Steps:"
echo "1. Deploy server code to /var/www/zaruda-api"
echo "2. Copy .env file into /var/www/zaruda-api/server/.env"
echo "3. Run PM2 cluster: cd /var/www/zaruda-api/server && pm2 start ecosystem.config.js"
echo "4. Connect Cloudflare Tunnel: cloudflared tunnel run zaruda-vps-tunnel"
echo "=============================================================================="
