import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages project sites are served at https://username.github.io/repo-name/,
  // not the domain root -- base must match your exact repo name (case-sensitive),
  // or built asset URLs (JS/CSS) will 404. Replace REPO_NAME_HERE below.
  base: '/embedded_labs/',
})