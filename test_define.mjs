import { build } from 'vite';

await build({
  root: '.',
  build: {
    write: false,
    rollupOptions: {
      input: 'src/main.tsx'
    }
  },
  define: {
    'process.versions.node': 'undefined'
  }
});
