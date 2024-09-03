import { resolve } from 'node:path';
import process from 'node:process';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		vue({
			template: {
				compilerOptions: {
					// Register figma-overlay as a custom element
					isCustomElement: tag => tag.includes('figma-overlay')
				}
			}
		}),
		dts({
			insertTypesEntry: true
		})
	],
	build: {
		lib: {
			entry: resolve(__dirname, 'src/main.ce.ts'),
			name: 'figma-overlay',
			// Output file names will have '.js' extension
			fileName: format => `figma-overlay.${format}.js`
		}
	},
	define: {
		'process.env': process.env
	}
});
