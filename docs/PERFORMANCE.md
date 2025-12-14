# Performance Optimization Guide

This document outlines the performance optimizations implemented in Home Asset Keeper.

## Code Splitting

### Route-based Code Splitting

All routes are lazy-loaded to reduce initial bundle size:

```typescript
// Pages are loaded on-demand
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Items = lazy(() => import('./pages/Items'));
```

**Benefits**:

- Smaller initial bundle
- Faster initial page load
- Better caching (each route is a separate chunk)

### Manual Chunks

Vendor libraries are split into separate chunks:

- `react-vendor`: React, React DOM, React Router
- `ui-vendor`: Radix UI components
- `query-vendor`: TanStack Query
- `form-vendor`: React Hook Form, Zod
- `utils-vendor`: Utility libraries

**Benefits**:

- Better caching (vendor code changes less frequently)
- Parallel loading
- Smaller individual chunks

## Image Optimization

### Lazy Loading

Use the `LazyImage` component for images:

```tsx
import { LazyImage } from '@/components/common/LazyImage';

<LazyImage src="/path/to/image.jpg" alt="Description" placeholder="/path/to/placeholder.jpg" />;
```

**Features**:

- Intersection Observer API
- Placeholder support
- Smooth fade-in animation
- Error handling

### Best Practices

1. **Use appropriate image formats**:
   - WebP for modern browsers
   - JPEG for photos
   - PNG for graphics with transparency
   - SVG for icons and logos

2. **Optimize image sizes**:
   - Compress images before uploading
   - Use responsive images
   - Provide multiple sizes

3. **Lazy load below-the-fold images**:
   - Always lazy load images not immediately visible
   - Use placeholders for better UX

## Performance Hooks

### useDebounce

Delay value updates (useful for search):

```tsx
import { useDebounce } from '@/hooks/useDebounce';

const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  // API call with debounced value
  searchItems(debouncedSearch);
}, [debouncedSearch]);
```

### useThrottle

Limit function calls (useful for scroll/resize):

```tsx
import { useThrottle } from '@/hooks/useThrottle';

const [scrollY, setScrollY] = useState(0);
const throttledScrollY = useThrottle(scrollY, 100);
```

### useMemoizedCallback

Memoize callbacks with stable references:

```tsx
import { useMemoizedCallback } from '@/hooks/useMemoizedCallback';

const handleClick = useMemoizedCallback((id: string) => {
  // Handle click
});
```

## Bundle Analysis

### Analyze Bundle Size

```bash
npm run analyze
```

This generates a visual report at `dist/stats.html` showing:

- Bundle sizes
- Chunk breakdown
- Gzip/Brotli sizes
- Dependency tree

### Optimize Bundle

1. **Check for large dependencies**:
   - Look for unexpectedly large packages
   - Consider alternatives

2. **Tree shaking**:
   - Use ES modules
   - Avoid default imports from large libraries

3. **Dynamic imports**:
   - Load heavy libraries on-demand
   - Split large components

## Caching Strategies

### Browser Caching

Static assets are cached with long expiration:

```nginx
# nginx.conf
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Service Worker (Future)

For offline support and advanced caching:

- Cache static assets
- Cache API responses
- Offline fallbacks

## React Query Caching

TanStack Query provides automatic caching:

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});
```

**Benefits**:

- Automatic request deduplication
- Background refetching
- Optimistic updates

## Performance Monitoring

### Web Vitals

Monitor Core Web Vitals:

- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

### Lighthouse

Run Lighthouse audits:

```bash
# Chrome DevTools → Lighthouse
# Or use Lighthouse CI
```

### Bundle Size Monitoring

Track bundle size over time:

- Set size budgets
- Monitor in CI/CD
- Alert on size increases

## Best Practices

### 1. Minimize Re-renders

- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references

### 2. Virtual Scrolling

For large lists:

```tsx
// Consider using react-window or react-virtualized
import { FixedSizeList } from 'react-window';
```

### 3. Code Splitting

- Lazy load routes
- Lazy load heavy components
- Dynamic imports for large libraries

### 4. Optimize Imports

```tsx
// ❌ Bad - imports entire library
import _ from 'lodash';

// ✅ Good - imports only needed function
import debounce from 'lodash/debounce';
```

### 5. Reduce Bundle Size

- Remove unused dependencies
- Use tree-shaking friendly imports
- Consider lighter alternatives

## Performance Checklist

- [ ] Routes are lazy-loaded
- [ ] Images are lazy-loaded
- [ ] Vendor chunks are split
- [ ] Bundle size is analyzed
- [ ] Large dependencies are optimized
- [ ] Caching is configured
- [ ] Performance metrics are monitored
- [ ] Lighthouse score > 90

---

**Last Updated**: December 2024
