import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@vib/types': path.resolve(__dirname, '../../packages/types/src'),
            '@vib/shared-ui': path.resolve(__dirname, '../../packages/shared-ui/src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5001',
                changeOrigin: true,
            },
        },
    },
});
//# sourceMappingURL=vite.config.js.map