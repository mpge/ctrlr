import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'node20',
  external: ['react', 'react/jsx-runtime', 'ink', '@xterm/headless'],
  loader: { '.tsx': 'tsx' },
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
});
