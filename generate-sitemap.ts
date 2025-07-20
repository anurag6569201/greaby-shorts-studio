import Sitemap from 'react-router-sitemap'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

// Required to resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Import App.tsx (assuming default export)
import routes from './src/App'

const sitemap = new Sitemap(routes)
  .build('https://greaby.cloud')
  .save(path.resolve(__dirname, 'public', 'sitemap.xml'))

console.log('✅ Sitemap generated: public/sitemap.xml')
