import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [react()],
	root: 'src/ui',
	build: {
		outDir: '../../ui-dist',
		emptyOutDir: true,
	},
	server: {
		port: 5173,
		proxy: {
			'/api': 'http://localhost:3000',
		},
	},
});
