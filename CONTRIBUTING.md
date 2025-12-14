# Contributing to Home Asset Keeper

First off, thank you for considering contributing to Home Asset Keeper! It's people like you that make this project better for everyone.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Pull Request Process](#pull-request-process)
- [Style Guidelines](#style-guidelines)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm or bun package manager
- Git

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/home-asset-keeper.git
   cd home-asset-keeper
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/home-asset-keeper.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

5. **Create environment file**:
   ```bash
   cp .env.example .env
   ```

6. **Start the development server**:
   ```bash
   npm run dev
   ```

7. **Open your browser** to `http://localhost:8080`

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-barcode-scanning`
- `fix/login-validation-error`
- `docs/update-readme`
- `refactor/auth-provider`

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Build process, dependencies, etc.

**Examples:**
```
feat(items): add barcode scanning support
fix(auth): resolve session timeout issue
docs(readme): add self-hosting instructions
refactor(storage): extract provider interface
```

### Before Submitting

1. **Ensure your code builds**:
   ```bash
   npm run build
   ```

2. **Run linting**:
   ```bash
   npm run lint
   ```

3. **Run tests** (when available):
   ```bash
   npm run test
   ```

4. **Update documentation** if needed

5. **Check Lovable.dev compatibility**:
   - Don't remove the `lovable-tagger` dependency
   - Keep standard React component patterns
   - Ensure vite.config.ts remains compatible

## Pull Request Process

1. **Update your fork** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch** to your fork:
   ```bash
   git push origin feature/your-feature
   ```

3. **Create a Pull Request** on GitHub:
   - Use a clear, descriptive title
   - Reference any related issues (`Fixes #123`)
   - Describe what changes you made and why
   - Include screenshots for UI changes

4. **Address review feedback**:
   - Make requested changes
   - Push additional commits
   - Request re-review when ready

5. **Celebrate** when merged! 🎉

### PR Checklist

- [ ] Code builds without errors
- [ ] Linting passes
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)
- [ ] Lovable.dev compatibility maintained
- [ ] No security vulnerabilities introduced
- [ ] Follows code style guidelines

## Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Prefer `interface` over `type` for object shapes
- Use explicit return types for functions
- Avoid `any` - use `unknown` if type is truly unknown

```typescript
// Good
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): User | null {
  // ...
}

// Avoid
type User = {
  id: any;
  name: any;
};
```

### React Components

- Use functional components with hooks
- Use named exports for components
- Keep components focused and small
- Extract reusable logic into custom hooks

```typescript
// Good
export function ItemCard({ item, onEdit }: ItemCardProps) {
  const { toast } = useToast();
  
  const handleEdit = () => {
    onEdit(item);
    toast({ title: 'Editing item' });
  };
  
  return (
    <Card>
      {/* ... */}
    </Card>
  );
}

// Avoid
export default function(props) {
  // Anonymous default export
}
```

### File Organization

```
src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui components
│   └── items/        # Feature-specific components
├── contexts/          # React contexts
├── hooks/            # Custom React hooks
├── lib/              # Utilities and providers
│   ├── auth/         # Authentication logic
│   └── receipt/      # Receipt parsing
├── pages/            # Route page components
└── types/            # TypeScript type definitions
```

### CSS/Tailwind

- Use Tailwind CSS utility classes
- Extract repeated patterns to components
- Use CSS variables for theming
- Keep responsive design in mind

## Reporting Bugs

### Before Reporting

1. **Search existing issues** to avoid duplicates
2. **Check if it's a configuration issue**
3. **Try the latest version**

### Bug Report Template

```markdown
## Description
A clear description of the bug.

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What you expected to happen.

## Actual Behavior
What actually happened.

## Environment
- OS: [e.g., Windows 11, macOS 14]
- Browser: [e.g., Chrome 120]
- Version: [e.g., 0.5.0]

## Screenshots
If applicable, add screenshots.

## Additional Context
Any other relevant information.
```

## Suggesting Features

### Feature Request Template

```markdown
## Summary
Brief description of the feature.

## Problem
What problem does this solve?

## Proposed Solution
How should this work?

## Alternatives Considered
Other approaches you've thought about.

## Additional Context
Any mockups, examples, or references.
```

### Feature Discussion

- Start with an issue before making big changes
- Discuss the approach before implementing
- Consider backwards compatibility
- Think about self-hosting implications

## Security Vulnerabilities

**Do not** report security vulnerabilities through public issues.

See [SECURITY.md](SECURITY.md) for responsible disclosure.

## Questions?

- Open a [GitHub Discussion](https://github.com/OWNER/home-asset-keeper/discussions)
- Check existing documentation
- Review closed issues for similar questions

## Recognition

Contributors are recognized in:
- The README.md contributors section
- Release notes for significant contributions
- The project's GitHub contributors page

Thank you for helping make Home Asset Keeper better! 🏠📦

