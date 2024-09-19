import type { Plugin, ResolvedConfig } from 'vite'
import { rm, mkdir, cp, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import type { BuildOptions } from '../../base.js'
import buildPlugin, { defaultOptions } from '../../base.js'

const OUTPUT_DIR_NAME = '.vercel/output'
const OUTPUT_JS_NAME = 'index.js'

export type VercelBuildOptions = {
  runtime?: string
} & BuildOptions

const vercelBuildPlugin = (pluginOptions?: VercelBuildOptions): Plugin => {
  let config: ResolvedConfig
  return {
    ...buildPlugin({
      ...pluginOptions,
      output: OUTPUT_JS_NAME,
    }),
    configResolved: async (resolvedConfig) => {
      config = resolvedConfig
    },
    writeBundle: async () => {
      const outputPath = resolve(config.root, OUTPUT_DIR_NAME)

      // Cleanup
      await rm(outputPath, {
        recursive: true,
        force: true,
      })
      await mkdir(outputPath, {
        recursive: true,
      })

      // Copy dist to static
      await cp(
        resolve(config.root, pluginOptions?.outputDir ?? defaultOptions.outputDir),
        resolve(outputPath, 'static'),
        {
          recursive: true,
        }
      )
      await rm(resolve(outputPath, 'static', OUTPUT_JS_NAME))

      // Copy index.js to functions
      await mkdir(resolve(outputPath, 'functions/index.func'), {
        recursive: true,
      })
      await cp(
        resolve(config.root, pluginOptions?.outputDir ?? defaultOptions.outputDir, OUTPUT_JS_NAME),
        resolve(outputPath, 'functions/index.func', OUTPUT_JS_NAME)
      )

      // Write .vc-config.json
      const functionConfig = {
        runtime: pluginOptions?.runtime ?? 'nodejs20.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        shouldAddHelpers: true,
      }
      await writeFile(
        resolve(outputPath, 'functions/index.func/.vc-config.json'),
        JSON.stringify(functionConfig)
      )

      // Write config.json
      const vercelConfig = {
        version: 3,
      }
      await writeFile(resolve(outputPath, 'config.json'), JSON.stringify(vercelConfig))
    },
    name: '@hono/vite-build/vercel',
  }
}

export default vercelBuildPlugin
