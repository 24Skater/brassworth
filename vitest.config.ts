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
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
        '**/coverage/',
        '**/playwright-report/',
        '**/test-results/',
        // Vendored shadcn/ui, copied from upstream rather than authored here.
        // It is 26% of the source by line count and is presentational wrappers
        // over Radix primitives; testing it would measure upstream's work, not
        // ours. Anything moved out of here and given real logic should be
        // covered like any other file.
        'src/components/ui/**',
        // Type-only modules compile to nothing meaningful to execute.
        'src/types/**',
        'src/vite-env.d.ts',
        // Build and documentation tooling. These are developer scripts run by
        // hand, never imported by the app, and never shipped in a bundle;
        // counting them would measure the toolbox rather than the product.
        'scripts/**',
      ],
      // Ratchet floor, not the goal. Set just under the measured coverage so
      // it cannot regress; raise them as suites land. All four now clear the
      // project's 80% standard.
      thresholds: {
        statements: 87,
        branches: 86,
        functions: 80,
        lines: 87,
      },
    },
    include: ['tests/**/*.{test,spec}.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tests/e2e/**', '**/node_modules/**', '**/dist/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
