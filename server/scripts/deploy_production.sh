#!/usr/bin/env bash
# ==============================================================================
# Zaruda Backend Production Deployment Script
# ==============================================================================
set -e

echo "🚀 Starting Zaruda Production Deployment..."

# 1. Environment Check
if [ ! -f ".env" ]; then
    echo "❌ Error: .env file missing in server root!"
    exit 1
fi

# 2. Install dependencies
echo "📦 Installing production npm packages..."
npm ci --only=production

# 3. Database migrations / schema check
echo "🗄️ Running schema checks..."
node -e "require('./src/config/schemaGuard').verifyDatabaseSchema().then(() => console.log('✅ Schema verified')).catch(e => { console.error('❌ Schema error', e); process.exit(1); })"

# 4. Storage permissions check
echo "📁 Setting storage permissions..."
mkdir -p public_uploads private_uploads logs
chmod -R 755 public_uploads private_uploads logs

# 5. PM2 Cluster Management
echo "⚡ Starting PM2 cluster..."
if command -v pm2 &> /dev/null; then
    pm2 reload ecosystem.config.js || pm2 start src/index.js --name "zaruda-api" -i max
    pm2 save
    echo "✅ PM2 cluster active."
else
    echo "⚠️ PM2 not installed globally. Run: npm install -g pm2"
fi

echo "🎉 Deployment successful!"
