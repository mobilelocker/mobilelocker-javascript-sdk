import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        clearMocks: true,
        restoreMocks: true,
        coverage: {
            provider: 'v8',
            include: ['src/**/*.ts'],
            exclude: ['src/types/**'],
            reporter: ['text', 'html', 'lcov'],
        },
    },
})
