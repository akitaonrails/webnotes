import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['test/javascript/**/*.test.js'],
    environment: 'node',
  },
  resolve: {
    alias: {
      'lib': path.resolve(__dirname, 'app/javascript/lib'),
      'marked': path.resolve(__dirname, 'test/javascript/mocks/marked.js'),
    },
  },
})
