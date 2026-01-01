import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // This hides the code structure from "Inspect Element"
    sourcemap: false, 
    // This uses the package you just installed to scramble variable names
    minify: 'terser', 
    terserOptions: {
        compress: {
            // This removes console.log statements from the production build
            drop_console: true, 
            drop_debugger: true,
        },
    },
  }
})