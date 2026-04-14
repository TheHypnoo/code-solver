import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function getBasePath() {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    return '/'
  }

  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1]

  return repository ? `/${repository}/` : '/'
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
})
