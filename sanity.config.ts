import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {presentation} from './presentation'
import {aiAssist} from './assist'

export default defineConfig({
  name: 'default',
  title: 'test project',

  projectId: '4epy89g7',
  dataset: 'production',

  plugins: [structureTool(), presentation, aiAssist, visionTool()],

  schema: {
    types: schemaTypes,
  },
})
