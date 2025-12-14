#!/usr/bin/env node

/**
 * Bundle analysis script
 * Generates a visual report of bundle sizes
 */

import { visualizer } from 'rollup-plugin-visualizer';
import { build } from 'vite';
import { resolve } from 'path';

const config = {
  build: {
    rollupOptions: {
      plugins: [
        visualizer({
          filename: './dist/stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
      ],
    },
  },
};

console.log('📊 Building and analyzing bundle...');

build(config)
  .then(() => {
    console.log('✅ Bundle analysis complete!');
    console.log('📄 Report saved to dist/stats.html');
  })
  .catch((error) => {
    console.error('❌ Bundle analysis failed:', error);
    process.exit(1);
  });
