# Home Asset Keeper

> An open-source home inventory and asset management system designed for homeowners, churches, small businesses, and organizations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)

## 🎯 Overview

**Home Asset Keeper** is a privacy-first, self-hostable application for tracking and managing your assets. Whether you're a homeowner keeping track of personal property, a church managing equipment, or a small business inventorying assets, this tool helps you organize everything in one place.

### Key Features

- 🏠 **Multi-Organization Support** - Manage multiple properties or locations
- 👥 **Role-Based Access Control** - ADMIN, MANAGER, CONTRIBUTOR, and VIEWER roles
- 📦 **Comprehensive Item Management** - Track items with categories, locations, tags, and more
- 📸 **Receipt Scanning** - OCR-powered receipt scanning with Tesseract.js
- 📊 **Multiple View Modes** - Grid, list, gallery, and table views
- 📥 **Import/Export** - Excel import and export functionality
- 🎨 **Beautiful UI** - Modern interface built with shadcn/ui and Tailwind CSS
- 🔒 **Privacy-First** - Self-hostable, your data stays yours
- 🚀 **Easy Deployment** - Docker support for one-command deployment

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd home-asset-keeper

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

## 📖 Documentation

### User Documentation

- **[User Guide](./docs/USER_GUIDE.md)** - Complete user manual
- **[FAQ](./docs/FAQ.md)** - Frequently asked questions
- **[Troubleshooting](./docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[Quick Start Guide](./docs/QUICK_START_GUIDE.md)** - Get started quickly

### Developer Documentation

- **[Testing Guide](./docs/TESTING.md)** - Test layers, how to run them, and the pre-PR checklist

- **[Developer Guide](./docs/DEVELOPER_GUIDE.md)** - Guide for contributors
- **[Architecture](./docs/ARCHITECTURE.md)** - System architecture and design
- **[Plan to v1.0](./docs/PLAN_TO_V1.0.md)** - Comprehensive development plan
- **[Roadmap](./docs/ROADMAP_V1.md)** - Feature roadmap and milestones

### Technical Documentation

- **[Authentication Providers](./docs/AUTH_PROVIDERS.md)** - Guide to custom auth providers
- **[Storage Providers](./docs/STORAGE_PROVIDERS.md)** - Storage backend guide
- **[Deployment](./docs/DEPLOYMENT.md)** - Deployment instructions
- **[Performance](./docs/PERFORMANCE.md)** - Performance optimization guide
- **[Accessibility](./docs/ACCESSIBILITY.md)** - Accessibility guide

### Project Documentation

- **[Contributing](./CONTRIBUTING.md)** - How to contribute to the project
- **[Security Policy](./SECURITY.md)** - Security policy and vulnerability reporting
- **[Code of Conduct](./CODE_OF_CONDUCT.md)** - Community standards

## 🛠️ Technology Stack

### Frontend

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **shadcn/ui** - UI component library
- **Tailwind CSS** - Styling
- **TanStack Query** - Data fetching and caching
- **React Router** - Routing
- **React Hook Form + Zod** - Form handling and validation

### Features

- **Tesseract.js** - OCR for receipt scanning
- **PDF.js** - PDF parsing
- **xlsx** - Excel import/export

## 🐳 Self-Hosting

### Docker (Recommended) - One Command!

```bash
# Quick start
docker-compose up -d
```

The application will be available at http://localhost

### Production Deployment with SSL

```bash
# Set up SSL certificates first (see docs/DEPLOYMENT.md)
docker-compose -f docker-compose.prod.yml up -d
```

### Manual Deployment

1. Build the application:

   ```bash
   npm run build
   ```

2. Serve the `dist` directory with a web server (nginx, Apache, etc.)

3. Configure your reverse proxy with security headers (see [SECURITY.md](./SECURITY.md))

### Deployment Options

- **Docker Compose** - One-command deployment ✅
- **Production Docker** - With SSL/HTTPS support ✅
- **Static Hosting** - Netlify, Vercel, GitHub Pages
- **Self-Hosted** - Your own server with nginx/Apache

For detailed deployment instructions, see the [deployment guide](./docs/DEPLOYMENT.md).

## 🔒 Security

⚠️ **Important Security Notice**: The current version uses client-side authentication with localStorage. This is **NOT SECURE** for production multi-user deployments.

### Current Security Status

- ✅ Input validation with Zod
- ✅ XSS protection (React's built-in)
- ⚠️ Client-side password hashing (SHA-256) - **NOT for production**
- ⚠️ No rate limiting - **vulnerable to brute force**
- ⚠️ No encryption for stored data

### Security Roadmap

See [PLAN_TO_V1.0.md](./docs/PLAN_TO_V1.0.md) for the security hardening plan, including:

- Server-side authentication
- Rate limiting
- Input sanitization (DOMPurify)
- Security headers
- Data encryption

For security vulnerabilities, please see [SECURITY.md](./SECURITY.md).

## 🧪 Development

### Available Scripts

```bash
# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
npm run type-check   # Type check without emitting

# Testing (coming soon)
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
```

### Project Structure

```
home-asset-keeper/
├── src/
│   ├── components/     # React components
│   │   ├── ui/        # shadcn/ui components
│   │   ├── items/     # Item-related components
│   │   └── users/     # User management components
│   ├── contexts/      # React contexts
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and providers
│   │   ├── auth/      # Authentication logic
│   │   └── storage.ts # Storage utilities
│   ├── pages/         # Route page components
│   └── types/         # TypeScript type definitions
├── docs/              # Documentation
├── public/            # Static assets
└── tests/             # Test files (coming soon)
```

### Lovable.dev Integration

This project is compatible with [Lovable.dev](https://lovable.dev) for visual editing. Changes made locally will sync to Lovable.dev via Git, and changes made in Lovable.dev will sync back locally.

**Lovable Project**: https://lovable.dev/projects/a60de1ac-5438-43d0-8bb4-15f6ff97d33a

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for:

- Development setup
- Code style guidelines
- Pull request process
- Issue reporting

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests and linting (`npm run lint && npm run type-check`)
5. Commit your changes (`git commit -m 'feat: add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📋 Roadmap

See [ROADMAP_V1.md](./docs/ROADMAP_V1.md) and [PLAN_TO_V1.0.md](./docs/PLAN_TO_V1.0.md) for detailed roadmap.

### Upcoming Features

- [ ] Backend API support
- [ ] IndexedDB provider for better persistence
- [ ] Docker deployment
- [ ] Security hardening
- [ ] Photo attachments
- [ ] Barcode/QR code scanning
- [ ] Maintenance reminders
- [ ] Insurance report generation

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the beautiful component library
- [Lovable.dev](https://lovable.dev) for the development platform
- All contributors and users of this project

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/home-asset-keeper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/home-asset-keeper/discussions)
- **Security**: See [SECURITY.md](./SECURITY.md) for vulnerability reporting

---

**Status**: 🚧 In Active Development - See [PLAN_TO_V1.0.md](./docs/PLAN_TO_V1.0.md) for progress

Made with ❤️ for the self-hosting community
