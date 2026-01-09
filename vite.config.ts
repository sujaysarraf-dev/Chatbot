import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // Use process.env for Netlify environment variables, fallback to .env file for local dev
    const getEnvVar = (key: string) => process.env[key] || env[key] || '';
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(getEnvVar('GEMINI_API_KEY')),
        'process.env.GEMINI_API_KEY': JSON.stringify(getEnvVar('GEMINI_API_KEY')),
        'process.env.OPENROUTER_API_KEY': JSON.stringify(getEnvVar('OPENROUTER_API_KEY')),
        'process.env.HUGGINGFACE_API_KEY': JSON.stringify(getEnvVar('HUGGINGFACE_API_KEY'))
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
