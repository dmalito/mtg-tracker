import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  // Relative, so the build works at any mount point: directly on :5001 and
  // behind Apache at /mtg-tracker/.
  base: './',
  server: {
    host: true,
    port: 5173,
  },
})