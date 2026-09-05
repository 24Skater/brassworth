# Deployment Guide

This guide covers various deployment options for Brassworth.

## Quick Start with Docker

### Prerequisites

- Docker and Docker Compose installed
- At least 512MB RAM available
- Port 80 (or custom port) available

### Basic Deployment

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd brassworth
   ```

2. **Build and run**:

   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   Open http://localhost in your browser

### Using Custom Port

Edit `docker-compose.yml` or set environment variable:

```bash
PORT=3000 docker-compose up -d
```

## Production Deployment

### With SSL/HTTPS

1. **Set up SSL certificates** (Let's Encrypt recommended):

   ```bash
   # Create SSL directory
   mkdir -p ssl

   # Copy your certificates
   cp your-cert.pem ssl/cert.pem
   cp your-key.pem ssl/key.pem
   ```

2. **Use production compose file**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Let's Encrypt Setup

1. **Install Certbot**:

   ```bash
   sudo apt-get install certbot
   ```

2. **Get certificate**:

   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

3. **Copy certificates**:

   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
   sudo chmod 644 ssl/cert.pem
   sudo chmod 600 ssl/key.pem
   ```

4. **Start with production config**:

   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

5. **Auto-renewal** (add to crontab):
   ```bash
   0 0 * * * certbot renew --quiet && docker-compose -f docker-compose.prod.yml restart nginx
   ```

## Environment Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Port mapping
PORT=80

# Storage provider
VITE_STORAGE_PROVIDER=localStorage

# Auth provider
VITE_AUTH_PROVIDER=localStorage

# API URL (if using API provider)
# VITE_API_URL=https://api.example.com
```

### Build-time Variables

For build-time configuration, use build args:

```dockerfile
ARG VITE_STORAGE_PROVIDER=localStorage
ENV VITE_STORAGE_PROVIDER=$VITE_STORAGE_PROVIDER
```

## Deployment Options

### 1. Docker Compose (Recommended)

**Best for**: Self-hosted deployments, single server

```bash
docker-compose up -d
```

**Pros**:

- Simple one-command deployment
- Easy updates
- Health checks included
- Automatic restarts

### 2. Docker Standalone

**Best for**: Custom orchestration, Kubernetes

```bash
# Build image
docker build -t brassworth:latest .

# Run container
docker run -d \
  --name brassworth \
  -p 80:80 \
  --restart unless-stopped \
  brassworth:latest
```

### 3. Static Hosting

**Best for**: Simple deployments, CDN hosting

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Deploy `dist` folder** to:
   - Netlify
   - Vercel
   - GitHub Pages
   - Cloudflare Pages
   - Any static hosting service

### 4. Manual Server Deployment

**Best for**: Full control, custom configurations

1. **Build the application**:

   ```bash
   npm run build
   ```

2. **Copy `dist` folder** to your server

3. **Configure nginx/Apache** (see `docs/SECURITY_HEADERS.md`)

4. **Set up SSL** (Let's Encrypt recommended)

## Updating

### Docker Compose

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker-compose up -d --build
```

### Docker Standalone

```bash
# Pull latest image
docker pull brassworth:latest

# Stop and remove old container
docker stop brassworth
docker rm brassworth

# Run new container
docker run -d \
  --name brassworth \
  -p 80:80 \
  --restart unless-stopped \
  brassworth:latest
```

## Backup and Restore

### Backup Data

Since data is stored in the browser (localStorage/IndexedDB), backups are user-specific:

1. **Export from application**:
   - Go to Settings → Backup
   - Export data as JSON
   - Save the file securely

2. **Browser data backup**:
   - Export browser profile
   - Or use browser's backup/export feature

### Restore Data

1. **Import in application**:
   - Go to Settings → Restore
   - Select exported JSON file
   - Import data

## Monitoring

### Health Checks

The application includes a health check endpoint:

```bash
curl http://localhost/health
# Returns: healthy
```

### Logs

**Docker Compose**:

```bash
# View logs
docker-compose logs -f

# View specific service
docker-compose logs -f frontend
```

**Docker Standalone**:

```bash
docker logs -f brassworth
```

### Resource Usage

```bash
# Docker stats
docker stats brassworth

# Or with docker-compose
docker-compose stats
```

## Troubleshooting

### Container Won't Start

1. **Check logs**:

   ```bash
   docker-compose logs frontend
   ```

2. **Check port availability**:

   ```bash
   netstat -tulpn | grep :80
   ```

3. **Check disk space**:
   ```bash
   df -h
   ```

### Build Fails

1. **Clear Docker cache**:

   ```bash
   docker system prune -a
   ```

2. **Rebuild without cache**:
   ```bash
   docker-compose build --no-cache
   ```

### SSL Issues

1. **Check certificate paths** in `docker-compose.prod.yml`
2. **Verify certificate permissions**
3. **Check nginx logs**:
   ```bash
   docker-compose logs nginx
   ```

## Security Checklist

- [ ] SSL/HTTPS configured
- [ ] Security headers set (see `docs/SECURITY_HEADERS.md`)
- [ ] Firewall configured (only ports 80, 443, SSH)
- [ ] Regular updates scheduled
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Logs reviewed regularly

## Performance Tuning

### Nginx

Edit `nginx.conf` to adjust:

- `worker_processes` - Number of CPU cores
- `worker_connections` - Connections per worker
- `keepalive_timeout` - Connection timeout
- `gzip_comp_level` - Compression level

### Docker

Limit resources in `docker-compose.yml`:

```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

## One-Click Deployments

### Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Click the Railway button
2. Connect your repository
3. Railway will auto-detect Dockerfile
4. Deploy!

### Render

1. Create new Web Service
2. Connect repository
3. Set build command: `docker build -t brassworth .`
4. Set start command: `docker run -p $PORT:80 brassworth`
5. Deploy!

### DigitalOcean App Platform

1. Create new App
2. Connect repository
3. Select Dockerfile
4. Configure environment variables
5. Deploy!

---

**Last Updated**: December 2024
