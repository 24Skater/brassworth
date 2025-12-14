# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| 0.9.x   | :white_check_mark: |
| < 0.9   | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

If you discover a security vulnerability, please follow these steps:

1. **Email us directly** at: [security@example.com](mailto:security@example.com)
   - Include a detailed description of the vulnerability
   - Include steps to reproduce the issue
   - Include potential impact assessment
   - Include any suggested fixes (if available)

2. **We will respond within 48 hours** to acknowledge receipt of your report

3. **We will provide regular updates** on the status of the vulnerability:
   - Initial assessment (within 1 week)
   - Fix development progress
   - Release timeline

4. **We will credit you** in the security advisory (unless you prefer to remain anonymous)

### What to Report

Please report:
- Authentication and authorization bypasses
- Cross-site scripting (XSS) vulnerabilities
- Cross-site request forgery (CSRF) vulnerabilities
- SQL injection vulnerabilities (when backend is implemented)
- Server-side request forgery (SSRF) vulnerabilities
- Remote code execution (RCE) vulnerabilities
- Sensitive data exposure
- Insecure direct object references
- Security misconfigurations
- Session management issues

### What NOT to Report

Please do not report:
- Issues that require physical access to the device
- Issues that require social engineering
- Denial of service (DoS) attacks
- Issues in third-party dependencies (report to the dependency maintainer)
- Issues that require admin/root access to the server
- Missing security headers in development mode
- Self-XSS (requires user interaction to exploit)

## Security Best Practices for Self-Hosters

### Deployment Security

1. **Always use HTTPS**
   - Use Let's Encrypt for free SSL certificates
   - Configure HSTS headers
   - Redirect HTTP to HTTPS

2. **Keep Dependencies Updated**
   - Regularly run `npm audit`
   - Enable Dependabot or Renovate
   - Review and apply security updates promptly

3. **Secure Your Server**
   - Keep the operating system updated
   - Use a firewall (UFW, iptables, etc.)
   - Disable unnecessary services
   - Use SSH keys instead of passwords
   - Configure fail2ban

4. **Environment Variables**
   - Never commit `.env` files to version control
   - Use strong, unique values for secrets
   - Rotate secrets regularly
   - Use environment-specific configurations

5. **Database Security** (when backend is implemented)
   - Use strong database passwords
   - Restrict database access to application server only
   - Enable database encryption at rest
   - Regular database backups

6. **Authentication**
   - Use strong passwords (12+ characters, complexity)
   - Enable MFA when available
   - Implement rate limiting
   - Monitor for suspicious activity

7. **Backup Security**
   - Encrypt backup files
   - Store backups securely
   - Test backup restoration regularly
   - Use off-site backups

### Security Headers

Configure your reverse proxy (nginx/Apache) with these security headers:

```nginx
# Nginx Configuration
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
```

### Docker Security

If using Docker:

1. **Use Official Images**
   - Use official base images
   - Keep images updated
   - Scan images for vulnerabilities

2. **Run as Non-Root**
   - Create non-root user in Dockerfile
   - Run containers as non-root

3. **Limit Resources**
   - Set memory limits
   - Set CPU limits
   - Use read-only filesystems where possible

4. **Network Security**
   - Use Docker networks to isolate services
   - Don't expose unnecessary ports
   - Use reverse proxy for HTTPS termination

### Known Security Considerations

#### Client-Side Authentication (localStorage provider)

⚠️ **WARNING**: The `localStorage` authentication provider is **NOT SECURE** for production use.

- Passwords are hashed client-side (SHA-256) - vulnerable to rainbow tables
- No server-side validation
- No protection against brute force attacks
- Session tokens stored in localStorage (XSS risk)

**Recommendation**: Use a backend authentication provider for production deployments.

#### Data Storage

- **localStorage**: Data stored in browser, not encrypted by default
- **IndexedDB**: Better persistence, but still client-side only
- **Backend API**: Recommended for production, enables encryption, backups, multi-user

#### Self-Hosting Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] Security headers configured
- [ ] Firewall configured
- [ ] Dependencies updated
- [ ] Environment variables secured
- [ ] Backups configured and tested
- [ ] Monitoring and logging enabled
- [ ] Rate limiting configured (when backend available)
- [ ] Regular security audits scheduled

## Security Updates

Security updates will be released as:
- **Patch versions** (1.0.1, 1.0.2) for low-severity issues
- **Minor versions** (1.1.0) for medium-severity issues
- **Major versions** (2.0.0) for high-severity issues requiring breaking changes

All security updates will be documented in:
- GitHub Security Advisories
- CHANGELOG.md
- Release notes

## Security Acknowledgments

We thank the following individuals and organizations for responsibly disclosing security vulnerabilities:

- (To be updated as vulnerabilities are reported)

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Last Updated**: December 2024


