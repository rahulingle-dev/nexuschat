import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { transformSync } from 'esbuild';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  plugins: [
    basicSsl(),
    {
      name: 'treat-react-native-node-modules',
      transform(code, id) {
        if ((id.includes('@expo') || id.includes('react-native')) && (id.endsWith('.js') || id.endsWith('.ts') || id.endsWith('.jsx') || id.endsWith('.tsx'))) {
          let cleaned = code;
          if (code.includes('@flow')) {
            cleaned = code
              .replace(/export type[\s\S]*?;/g, '')
              .replace(/type[\s\S]*?={[\s\S]*?};/g, '')
              .replace(/\+([a-zA-Z0-9_]+):/g, '$1:')
              .replace(/:\s*\?[a-zA-Z0-9_]+/g, '');
          }
          const loader = (id.endsWith('.tsx') || id.endsWith('.ts')) ? 'ts' : 'jsx';
          try {
            const result = transformSync(cleaned, { loader });
            return { code: result.code };
          } catch (e) {
            const result = transformSync(cleaned, { loader: 'ts' });
            return { code: result.code };
          }
        }
      }
    },
    react()
  ],
  optimizeDeps: {
    exclude: [
      '@react-native/assets-registry',
      'react-native'
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx'
      }
    }
  },
  resolve: {
    alias: {
      'react-native': 'react-native-web'
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js']
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/hubs': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
