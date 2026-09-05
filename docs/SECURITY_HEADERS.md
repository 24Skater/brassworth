# Security Headers Configuration Guide

This guide explains how to configure security headers for self-hosted deployments of Brassworth.

## Required Security Headers

For production deployments, configure your web server with the following security headers:

### 1. Content-Security-Policy (CSP)

Prevents XSS attacks by controlling which resources can be loaded.

**Recommended CSP for Brassworth:**

```
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self';
frame-ancestors 'none';
base-uri 'self';
form-action 'self';
```

**Note**: `unsafe-inline` and `unsafe-eval` are required for Vite's development mode. For production, consider using nonces or hashes.

### 2. Strict-Transport-Security (HSTS)

Forces browsers to use HTTPS only.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 3. X-Content-Type-Options

Prevents MIME type sniffing.

```
X-Content-Type-Options: nosniff
```

### 4. X-Frame-Options

Prevents clickjacking attacks.

```
X-Frame-Options: DENY
```

### 5. X-XSS-Protection

Enables browser's XSS filter (legacy, but still useful).

```
X-XSS-Protection: 1; mode=block
```

### 6. Referrer-Policy

Controls referrer information.

```
Referrer-Policy: strict-origin-when-cross-origin
```

### 7. Permissions-Policy

Controls browser features and APIs.

```
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

## Nginx Configuration

Add to your `nginx.conf` or site configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration (use Let's Encrypt)
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;

    # Root directory
    root /var/www/brassworth/dist;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Apache Configuration

Add to your `.htaccess` or virtual host configuration:

```apache
<IfModule mod_headers.c>
    # HSTS
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

    # X-Content-Type-Options
    Header always set X-Content-Type-Options "nosniff"

    # X-Frame-Options
    Header always set X-Frame-Options "DENY"

    # X-XSS-Protection
    Header always set X-XSS-Protection "1; mode=block"

    # Referrer-Policy
    Header always set Referrer-Policy "strict-origin-when-cross-origin"

    # Permissions-Policy
    Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"

    # Content-Security-Policy
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
</IfModule>

# Force HTTPS
<IfModule mod_rewrite.c>
    RewriteEngine On
    RewriteCond %{HTTPS} off
    RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
</IfModule>
```

## Docker/nginx Configuration

For Docker deployments using nginx:

```dockerfile
FROM nginx:alpine

COPY dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

`nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Testing Security Headers

Use these tools to verify your headers are configured correctly:

1. **SecurityHeaders.com**: https://securityheaders.com/
2. **Mozilla Observatory**: https://observatory.mozilla.org/
3. **Browser DevTools**: Check Network tab → Response Headers

## CSP for Production

For production, consider a stricter CSP:

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';" always;
```

This removes `unsafe-inline` and `unsafe-eval` for scripts, which requires:

- Using nonces or hashes for inline scripts
- Ensuring all scripts are from same origin
- Testing thoroughly before deploying

## Let's Encrypt SSL Setup

For free SSL certificates:

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

## Additional Security Recommendations

1. **Firewall**: Only allow ports 80, 443, and SSH (22)
2. **Fail2ban**: Protect against brute force attacks
3. **Regular Updates**: Keep server and dependencies updated
4. **Backup**: Regular automated backups
5. **Monitoring**: Set up log monitoring and alerts

---

**Last Updated**: December 2024
