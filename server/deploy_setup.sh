#!/usr/bin/env bash

# ==============================================================================
# Wyntechlabs Backend Deploy Setup Script for Ubuntu 22.04 / 24.04 LTS
# ==============================================================================

# Exit immediately if a command exits with a non-zero status
set -e

echo "===================================================="
echo "Starting Wyntechlabs VPS Environment Setup..."
echo "===================================================="

# Update system
echo "--> Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install core dependencies
echo "--> Installing core packages (curl, git, nginx, redis, ufw, certbot)..."
sudo apt install -y curl git nginx redis-server certbot python3-certbot-nginx ufw

# Install Node.js v20 LTS
echo "--> Installing Node.js v20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
echo "--> Installing PM2 globally..."
sudo npm install --global pm2

# Install PostgreSQL
echo "--> Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib

# Start and enable services
echo "--> Enabling Nginx, Redis, and PostgreSQL services..."
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Set up PostgreSQL database and user
echo "===================================================="
echo "Configuring PostgreSQL Database..."
echo "===================================================="
DB_NAME="mhub_db"
DB_USER="mhub_user"
# Generate a random password for PostgreSQL
DB_PASS=$(openssl rand -base64 16 | tr -d '/+=')

sudo -i -u postgres psql -c "CREATE DATABASE $DB_NAME;" || true
sudo -i -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" || true
sudo -i -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true

echo "PostgreSQL Configured successfully!"
echo "Database Name: $DB_NAME"
echo "Username: $DB_USER"
echo "Password: $DB_PASS"
echo "Write down this password! You will need it for your server's .env file."
echo "===================================================="

# Set up Nginx configuration block
echo "--> Configuring Nginx reverse proxy for api.wyntechlabs.com..."
NGINX_CONF="/etc/nginx/sites-available/api.wyntechlabs.com"

sudo bash -c "cat > $NGINX_CONF" <<EOF
server {
    listen 80;
    server_name api.wyntechlabs.com;

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

# Enable the Nginx site
sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Setup Firewall
echo "--> Configuring UFW Firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

echo "===================================================="
echo "VPS Environment Setup is COMPLETE!"
echo "===================================================="
echo "Next Steps:"
echo "1. Point the DNS A Record in Cloudflare: api.wyntechlabs.com -> VPS IP."
echo "2. Run Certbot to install free SSL certificates for api.wyntechlabs.com:"
echo "   sudo certbot --nginx -d api.wyntechlabs.com"
echo "3. Copy server/.env.example to server/.env on your server and edit the fields."
echo "4. Build and start your server using PM2:"
echo "   pm2 start ecosystem.config.js"
echo "===================================================="
