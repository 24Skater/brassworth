# Quick Start Guide - Next Steps

This guide provides immediate actionable steps to continue the open-source readiness work.

## 🎯 Immediate Actions (Do First)

### 1. Install Prettier (5 minutes)

```bash
npm install --save-dev prettier
```

Then format the codebase:

```bash
npm run format
```

### 2. Set Up Git Hooks (10 minutes)

```bash
# Install Husky
npm install --save-dev husky

# Initialize Husky
npx husky init

# Install lint-staged
npm install --save-dev lint-staged

# Install commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

Create `.husky/commit-msg`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit ${1}
```

Create `commitlint.config.js`:

```js
export default {
  extends: ['@commitlint/config-conventional'],
};
```

Update `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md}": ["prettier --write"]
  }
}
```

### 3. Enable TypeScript Strict Mode (30-60 minutes)

**Step 1**: Update `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Step 2**: Fix type errors incrementally:

```bash
npm run type-check
```

Fix errors file by file, starting with utilities and working up to components.

### 4. Set Up Testing (15 minutes)

```bash
# Install Vitest and testing libraries
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom

# Install coverage tool
npm install --save-dev @vitest/coverage-v8
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom';
```

### 5. Add Security Dependencies (5 minutes)

```bash
# Install DOMPurify for XSS prevention
npm install dompurify
npm install --save-dev @types/dompurify

# Install zxcvbn for password strength
npm install zxcvbn
npm install --save-dev @types/zxcvbn

# Install security ESLint plugins
npm install --save-dev eslint-plugin-security eslint-plugin-sonarjs
```

Update `eslint.config.js` to include security rules.

## 📋 Week 1 Checklist

- [ ] Prettier installed and code formatted
- [ ] Git hooks (Husky) configured
- [ ] Commitlint configured
- [ ] TypeScript strict mode enabled (or in progress)
- [ ] Testing framework (Vitest) set up
- [ ] Security dependencies installed
- [ ] `.env.example` verified and accessible
- [ ] All documentation reviewed

## 🔒 Security Quick Wins (Week 2-3)

### Password Strength

Create `src/lib/auth/passwordValidation.ts`:

```typescript
import zxcvbn from 'zxcvbn';

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} {
  const result = zxcvbn(password);

  return {
    isValid: result.score >= 3, // Require "strong" or better
    score: result.score,
    feedback: result.feedback.suggestions,
  };
}
```

### Input Sanitization

Create `src/lib/utils/sanitize.ts`:

```typescript
import DOMPurify from 'dompurify';

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

export function sanitizeText(text: string): string {
  return DOMPurify.sanitize(text, { ALLOWED_TAGS: [] });
}
```

## 🐳 Docker Quick Start (Week 11)

### Create Dockerfile

```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - '80:80'
    restart: unless-stopped
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost/']
      interval: 30s
      timeout: 10s
      retries: 3
```

## 📚 Documentation Updates Needed

- [ ] Add screenshots to README.md
- [ ] Create deployment guide (docs/DEPLOYMENT.md)
- [ ] Create API documentation (when backend ready)
- [ ] Add troubleshooting section to README

## 🧪 Testing Quick Start

Create your first test: `tests/lib/storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '@/lib/storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store and retrieve user', () => {
    const user = {
      id: '1',
      email: 'test@example.com',
      name: 'Test',
      createdAt: new Date().toISOString(),
    };
    storage.setUser(user);
    expect(storage.getUser()).toEqual(user);
  });
});
```

## 🔄 Continuous Integration

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run format:check

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:coverage

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
```

## 🎯 Priority Order

1. **This Week**: Git hooks, Prettier, TypeScript strict mode
2. **Next Week**: Testing setup, security dependencies
3. **Week 3**: Security implementations (password strength, sanitization)
4. **Week 4**: Rate limiting, security headers
5. **Week 5+**: Storage providers, Docker, CI/CD

## 📞 Need Help?

- Check `docs/ROADMAP.md` for product direction and milestones
- Review `CONTRIBUTING.md` for development guidelines
- See `SECURITY.md` for security best practices
- Open an issue for questions or blockers

---

**Remember**: Work incrementally. Don't try to do everything at once. Focus on one phase at a time.
