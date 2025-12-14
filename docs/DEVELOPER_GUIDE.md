# Developer Guide

This guide is for developers who want to contribute to or extend Home Asset Keeper.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Adding Features](#adding-features)
5. [Testing](#testing)
6. [Code Style](#code-style)
7. [Provider Development](#provider-development)

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm, yarn, pnpm, or bun
- Git
- Code editor (VS Code recommended)

### Setup

```bash
# Clone repository
git clone <repository-url>
cd home-asset-keeper

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### Development Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format with Prettier
npm run type-check   # TypeScript type checking
npm test             # Run tests
npm run test:ui      # Run tests with UI
npm run test:e2e     # Run E2E tests
```

## Project Structure

```
home-asset-keeper/
├── src/
│   ├── components/      # React components
│   │   ├── ui/         # shadcn/ui components
│   │   ├── auth/       # Auth components
│   │   ├── items/      # Item components
│   │   └── common/     # Shared components
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Utilities and providers
│   │   ├── auth/       # Auth providers
│   │   ├── storage/    # Storage providers
│   │   └── utils/      # Utility functions
│   ├── pages/          # Page components
│   └── types/          # TypeScript types
├── tests/              # Test files
├── docs/               # Documentation
├── public/             # Static assets
└── scripts/            # Build scripts
```

## Development Workflow

### Branch Strategy

- `main`: Production-ready code
- `develop`: Development branch
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pull Request Process

1. Create feature branch
2. Make changes
3. Write/update tests
4. Update documentation
5. Run linting and tests
6. Create pull request
7. Address review feedback

## Adding Features

### 1. Create Feature Branch

```bash
git checkout -b feature/my-feature
```

### 2. Add Types

Add TypeScript types in `src/types/`:

```typescript
export interface MyFeature {
  id: string;
  name: string;
  // ...
}
```

### 3. Create Components

Add components in `src/components/`:

```typescript
export function MyComponent() {
  // Component logic
}
```

### 4. Add Routes

Update `src/App.tsx`:

```typescript
const MyFeature = lazy(() => import('./pages/MyFeature'));

<Route path="/my-feature" element={<MyFeature />} />
```

### 5. Update Navigation

Add navigation link if needed.

### 6. Write Tests

Add tests in `tests/`:

```typescript
describe('MyFeature', () => {
  it('should work', () => {
    // Test
  });
});
```

### 7. Update Documentation

Update relevant docs in `docs/`.

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';

describe('MyFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
  it('should render', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### E2E Tests

```typescript
import { test, expect } from '@playwright/test';

test('user flow', async ({ page }) => {
  await page.goto('/');
  // Test steps
});
```

## Code Style

### TypeScript

- Use strict mode
- Avoid `any` type
- Use interfaces for object shapes
- Use types for unions/intersections

### React

- Use functional components
- Use hooks for state
- Extract reusable logic to custom hooks
- Keep components small and focused

### Naming Conventions

- **Components**: PascalCase (`MyComponent.tsx`)
- **Hooks**: camelCase starting with `use` (`useMyHook.ts`)
- **Utilities**: camelCase (`myUtility.ts`)
- **Types**: PascalCase (`MyType.ts`)

### File Organization

- One component per file
- Co-locate related files
- Use index files for exports

## Provider Development

### Creating a Storage Provider

1. Implement `StorageProvider` interface:

```typescript
import { StorageProvider } from '@/lib/storage/types';

export class MyStorageProvider implements StorageProvider {
  async getItems(): Promise<Item[]> {
    // Implementation
  }
  // ... implement all methods
}
```

2. Add to provider factory:

```typescript
// src/lib/storage/index.ts
case 'myprovider':
  storageProviderInstance = new MyStorageProvider();
  break;
```

3. Configure via environment:

```env
VITE_STORAGE_PROVIDER=myprovider
```

### Creating an Auth Provider

1. Implement `AuthProviderInterface`:

```typescript
import { AuthProviderInterface } from '@/lib/auth/types';

export class MyAuthProvider implements AuthProviderInterface {
  async login(email: string, password: string) {
    // Implementation
  }
  // ... implement all methods
}
```

2. Add to auth provider factory
3. Configure via environment

## Best Practices

### Performance

- Use lazy loading for routes
- Memoize expensive computations
- Optimize re-renders
- Use virtual scrolling for large lists

### Security

- Sanitize user input
- Validate on both client and server
- Use parameterized queries (when using API)
- Follow OWASP guidelines

### Accessibility

- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers

### Error Handling

- Use error boundaries
- Provide user-friendly messages
- Log errors appropriately
- Handle edge cases

## Debugging

### Browser DevTools

- React DevTools for component inspection
- Redux DevTools (if using Redux)
- Network tab for API calls
- Console for errors

### VS Code

- Use TypeScript language server
- Install ESLint extension
- Use Prettier extension
- Debug with Chrome debugger

## Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)

---

**Last Updated**: December 2024
