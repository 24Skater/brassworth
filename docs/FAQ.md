# Frequently Asked Questions (FAQ)

## General

### What is Brassworth?

Brassworth is an open-source, self-hostable application for tracking and managing assets. It's designed for homeowners, churches, small businesses, and organizations.

### Is it free?

Yes! Brassworth is open-source and free to use. You can self-host it on your own server.

### Do I need a server?

For single-user use, you can run it locally in your browser. For multi-user or production use, you'll need a server to host the application.

### Is my data secure?

Yes! When self-hosted, all your data stays on your server. The application includes security features like:

- Password strength requirements
- Input sanitization
- Rate limiting
- Role-based access control

## Installation & Setup

### How do I install Brassworth?

See the [Quick Start Guide](./QUICK_START_GUIDE.md) for detailed installation instructions.

### What are the system requirements?

- **Development**: Node.js 18+, npm/yarn/pnpm
- **Production**: Docker (recommended) or any web server
- **Browser**: Modern browser (Chrome, Firefox, Safari, Edge)

### Can I use it without Docker?

Yes! You can:

1. Build the application: `npm run build`
2. Serve the `dist` folder with any web server
3. Or use static hosting (Netlify, Vercel, etc.)

## Features

### Can I use it offline?

Currently, the application requires an internet connection to load. However, once loaded, you can use it offline if using localStorage or IndexedDB storage.

### How many items can I track?

- **localStorage**: ~5-10MB (thousands of items)
- **IndexedDB**: Much larger (millions of items)
- **API**: Unlimited (depends on backend)

### Can I import data from other systems?

Yes! You can import data from Excel files. See the [User Guide](./USER_GUIDE.md) for details.

### Can I export my data?

Yes! You can export all data to Excel format from Settings → Data tab.

## Multi-User

### Can multiple people use it?

Yes! The application supports multiple users with role-based access control:

- **Admin**: Full control
- **Manager**: Edit access
- **Contributor**: Add items only
- **Viewer**: Read-only

### How do I add users?

1. Go to Settings → Users tab
2. Click "Invite User"
3. Enter user details and role
4. User will receive invitation (when using backend)

### Can I restrict what users can see?

Yes! Users can only see items from organizations they're members of. Role-based permissions control what actions they can perform.

## Storage & Data

### Where is my data stored?

- **localStorage**: Browser localStorage (default)
- **IndexedDB**: Browser IndexedDB (better for large datasets)
- **API**: Backend database (when using backend)

### Can I backup my data?

Yes! Export your data regularly from Settings → Data tab. The export includes all items, locations, and categories.

### What happens if I clear my browser data?

If using localStorage or IndexedDB, clearing browser data will delete your inventory. Always export backups regularly!

### Can I migrate between storage types?

Yes! The application can automatically migrate from localStorage to IndexedDB. See [Storage Providers Guide](./STORAGE_PROVIDERS.md).

## Security

### Is my password secure?

The application enforces strong password requirements:

- Minimum 12 characters
- Uppercase, lowercase, numbers, special characters
- Password strength validation

**Note**: In prototype mode (localStorage), passwords are hashed client-side. For production, use a backend with server-side hashing.

### Can I use two-factor authentication?

Not yet, but it's planned for future releases.

### How do I reset my password?

In prototype mode, you'll need to clear browser data and create a new account. With a backend, password reset will be available.

## Troubleshooting

### The app won't load

1. Check browser console for errors
2. Clear browser cache
3. Try a different browser
4. Check network connection

### I can't see my items

1. Check you're in the correct organization
2. Verify filters aren't hiding items
3. Check your user role permissions
4. Try refreshing the page

### Receipt scanning isn't working

1. Ensure good lighting
2. Check image quality
3. Try a different receipt format
4. Check browser permissions for camera/file access

### Export isn't downloading

1. Check browser download settings
2. Try a different browser
3. Check available disk space
4. Disable browser extensions that block downloads

## Development

### Can I contribute?

Yes! See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### How do I report bugs?

Open an issue on GitHub with:

- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information

### Can I request features?

Yes! Open a feature request on GitHub. We welcome suggestions!

## Deployment

### Can I deploy to cloud services?

Yes! You can deploy to:

- Railway
- Render
- DigitalOcean
- Netlify/Vercel (static hosting)
- Any Docker-compatible platform

### Do I need SSL/HTTPS?

For production, yes! SSL is required for security. See [Deployment Guide](./DEPLOYMENT.md) for SSL setup.

### How do I update the application?

1. Pull latest changes: `git pull`
2. Rebuild: `docker-compose up -d --build`
3. Or: `npm run build` and redeploy

## Support

### Where can I get help?

- **Documentation**: Check the [docs](./) folder
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and discussions

### Is there a community?

We're building one! Join us on GitHub Discussions.

---

**Last Updated**: December 2024
