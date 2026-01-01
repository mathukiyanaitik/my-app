import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: false, // CRITICAL: This hides your code structure
    minify: 'terser', // CRITICAL: This scrambles variable names
  }
})