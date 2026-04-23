import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'mobilelocker',
            formats: ['es', 'cjs', 'umd'],
            fileName: (format) => {
                if (format === 'umd') return 'index.umd.js'
                if (format === 'es') return 'index.esm.js'
                return 'index.js'
            },
        },
        rollupOptions: {
            output: {
                exports: 'named',
            },
        },
    },
    plugins: [
        dts({ rollupTypes: true }),
    ],
})
