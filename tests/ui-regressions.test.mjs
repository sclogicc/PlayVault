import assert from 'node:assert/strict'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { build } from 'esbuild'

const outputDir = resolve('out/test')

async function importTypeScriptModule(entryFile, outputFile) {
  const outputPath = resolve(outputDir, outputFile)
  await mkdir(dirname(outputPath), { recursive: true })
  await build({
    entryPoints: [entryFile],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: outputPath,
    logLevel: 'silent',
  })
  return import(`${pathToFileURL(outputPath).href}?v=${Date.now()}`)
}

test.after(async () => {
  await rm(outputDir, { recursive: true, force: true })
})

test('only the category named by the current status filter is active', async () => {
  const { isLibraryCategoryActive } = await importTypeScriptModule(
    'src/renderer/src/lib/libraryNavigation.ts',
    'libraryNavigation.mjs',
  )

  assert.equal(isLibraryCategoryActive('all', '/games', ''), true)
  assert.equal(isLibraryCategoryActive('not_started', '/games', ''), false)
  assert.equal(isLibraryCategoryActive('not_started', '/games', '?status=not_started'), true)
  assert.equal(isLibraryCategoryActive('in_progress', '/games', '?status=not_started'), false)
  assert.equal(isLibraryCategoryActive('completed', '/games/42', '?status=completed'), false)
})

test('local screenshot paths use the controlled preview protocol', async () => {
  const { parseLocalMediaUrl, toLocalMediaUrl } = await importTypeScriptModule(
    'src/shared/localMedia.ts',
    'localMedia.mjs',
  )
  const { getImageMimeType } = await importTypeScriptModule(
    'src/main/services/localImage.ts',
    'localImage.mjs',
  )
  const filePath = 'D:\\Screenshots\\example image.PNG'
  const previewUrl = toLocalMediaUrl(filePath)

  assert.equal(parseLocalMediaUrl(previewUrl), filePath)
  assert.equal(getImageMimeType(filePath), 'image/png')
  assert.equal(getImageMimeType('D:\\note.txt'), null)
})

test('image viewer navigation wraps at both ends of the screenshot list', async () => {
  const { getNextImageIndex } = await importTypeScriptModule(
    'src/renderer/src/lib/imageViewerNavigation.ts',
    'imageViewerNavigation.mjs',
  )

  assert.equal(getNextImageIndex(0, -1, 3), 2)
  assert.equal(getNextImageIndex(2, 1, 3), 0)
  assert.equal(getNextImageIndex(1, 1, 3), 2)
  assert.equal(getNextImageIndex(0, 1, 0), 0)
})

test('cover crop settings fall back safely and clamp invalid values', async () => {
  const { parseCoverCrop, serializeCoverCrop } = await importTypeScriptModule(
    'src/shared/coverCrop.ts',
    'coverCrop.mjs',
  )

  assert.deepEqual(parseCoverCrop(''), { zoom: 1, x: 0, y: 0 })
  assert.deepEqual(
    parseCoverCrop('{"zoom":9,"x":-300,"y":250}'),
    { zoom: 3, x: -100, y: 100 },
  )
  assert.equal(
    serializeCoverCrop({ zoom: 9, x: -300, y: 250 }),
    '{"zoom":3,"x":-100,"y":100}',
  )
})
