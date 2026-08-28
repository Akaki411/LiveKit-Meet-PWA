import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { transform } from 'lightningcss'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const stylesDir = path.join(root, 'src', 'styles')
const outDir = path.join(stylesDir, 'generated')
mkdirSync(outDir, { recursive: true })

const files = readdirSync(stylesDir).filter((f) => f.endsWith('.module.css'))
const generatedCss = []

for (const file of files) {
  const base = file.replace(/\.module\.css$/, '')
  const filename = path.join(stylesDir, file)
  const code = readFileSync(filename)

  const { code: outCode, exports = {} } = transform({
    filename,
    code,
    cssModules: true,
    minify: false,
  })

  const map = {}
  for (const [local, info] of Object.entries(exports)) {
    map[local] = info.name
  }

  writeFileSync(path.join(outDir, `${base}.css`), outCode)
  writeFileSync(
    path.join(outDir, `${base}.classes.ts`),
    `'use client';\n\n`
      + `// AUTO-GENERATED from styles/${file} — do not edit.\n`
      + `const classes: Record<string, string> = ${JSON.stringify(map, null, 2)}\n`
      + `export default classes\n`,
  )
  generatedCss.push(`${base}.css`)
  console.log(`compiled ${file} -> ${Object.keys(map).length} classes`)
}

writeFileSync(
  path.join(outDir, 'all.css'),
  generatedCss.map((f) => `@import './${f}';`).join('\n') + '\n',
)
console.log(`\nwrote ${files.length} modules to src/styles/generated/`)
