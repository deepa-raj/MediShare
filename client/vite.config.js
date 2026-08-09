// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   plugins: [react()],
//   base: process.env.VITE_BASE_PATH || "/MediShare",
//   server: {
//     port: 5173,
//   },
//   test: {
//     environment: 'jsdom',
//     setupFiles: ['./src/test/setup.js'],
//     globals: true,
//   },
// });


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
 
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
  },
});
 