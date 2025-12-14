# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive plan document for v1.0 release
- Security policy and vulnerability reporting process
- Code of Conduct for community standards
- Environment variable configuration template (.env.example)
- Prettier configuration for code formatting
- EditorConfig for consistent editor settings
- TypeScript strict mode enabled for better type safety
- ESLint improvements with stricter rules
- Git hooks (Husky) with pre-commit and commit-msg hooks
- Commitlint for conventional commit validation
- Lint-staged for automatic code formatting and linting
- Vitest testing framework with React Testing Library
- Playwright for E2E testing
- Initial unit tests for storage and utilities
- Initial E2E tests for authentication flow
- GitHub Actions CI/CD pipeline
- MIT License file
- Test setup files and configuration

### Changed
- Improved project documentation structure
- Enhanced ESLint configuration with security-focused rules
- Updated package.json with proper metadata and scripts
- Updated .gitignore with test artifacts and coverage
- TypeScript configuration now uses strict mode (type errors to be fixed incrementally)

### Fixed
- Code quality and consistency improvements

## [0.0.0] - 2024-12-XX

### Added
- Initial project setup with React + TypeScript + Vite
- shadcn/ui component library integration
- Role-based access control (ADMIN, MANAGER, CONTRIBUTOR, VIEWER)
- Multi-organization support
- Item management with categories, locations, and tags
- Receipt scanning with OCR (Tesseract.js)
- Excel import/export functionality
- Multiple view modes (grid, list, gallery, table)
- Provider-based architecture for authentication
- LocalStorage authentication provider (prototype)
- LocalStorage data persistence
- Dashboard with statistics
- User management
- Settings page
- Lovable.dev integration

### Security
- ⚠️ **WARNING**: Current authentication uses client-side SHA-256 hashing - NOT secure for production
- ⚠️ **WARNING**: Data stored in localStorage without encryption
- ⚠️ **WARNING**: No rate limiting or brute force protection

---

## Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

---

## Version History

- **0.0.0**: Initial prototype release
- **0.5.0** (Planned): Open source ready
- **0.7.0** (Planned): Security hardened
- **0.8.0** (Planned): Storage providers
- **0.9.0** (Planned): Production ready
- **1.0.0** (Planned): First stable release

