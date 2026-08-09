import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifestPath = join(projectRoot, 'src', 'landing', 'asset-manifest.json')
const publicImageDirectory = join(projectRoot, 'public', 'img')

const legacyNames = ['tl.png', 'tr.png', 'bl.png', 'br.png', 'hachi-greciaspa.png']

function fail(message) {
  throw new Error(message)
}

function readManifest() {
  try {
    return JSON.parse(readFileSync(manifestPath, 'utf8'))
  } catch (error) {
    fail(`Unable to read asset manifest: ${error.message}`)
  }
}

function entriesForGroup(manifest, groupName) {
  const group = manifest[groupName]
  if (!Array.isArray(group)) {
    fail(`Manifest group "${groupName}" must be an array.`)
  }

  return group.map((entry, index) => {
    if (!entry || typeof entry.file !== 'string' || typeof entry.label !== 'string') {
      fail(`Manifest group "${groupName}" entry ${index} must contain file and label.`)
    }
    return entry.file
  })
}

function assertNoDuplicateEntries(groupName, files) {
  const duplicates = files.filter((file, index) => files.indexOf(file) !== index)
  if (duplicates.length > 0) {
    fail(`Duplicate asset name in manifest group "${groupName}": ${duplicates[0]}`)
  }
}

function manifestFiles(manifest) {
  if (!manifest.brand || typeof manifest.brand.logo !== 'string' || typeof manifest.brand.favicon !== 'string') {
    fail('Manifest brand group must contain logo and favicon filenames.')
  }

  const groups = {
    brand: [manifest.brand.logo, manifest.brand.favicon],
    story: entriesForGroup(manifest, 'story'),
    services: entriesForGroup(manifest, 'services'),
    gallery: entriesForGroup(manifest, 'gallery'),
  }

  for (const [groupName, files] of Object.entries(groups)) {
    assertNoDuplicateEntries(groupName, files)
  }

  return [...new Set(Object.values(groups).flat())]
}

function assertPublicDirectoryMatches(expectedFiles) {
  let actualFiles
  try {
    actualFiles = readdirSync(publicImageDirectory).filter((file) =>
      statSync(join(publicImageDirectory, file)).isFile(),
    )
  } catch (error) {
    fail(`Unable to read ${relative(projectRoot, publicImageDirectory)}: ${error.message}`)
  }

  const expected = [...expectedFiles].sort()
  const actual = [...actualFiles].sort()
  const missing = expected.filter((file) => !actual.includes(file))
  const unexpected = actual.filter((file) => !expected.includes(file))

  if (missing.length > 0 || unexpected.length > 0 || expected.length !== actual.length) {
    fail(
      [
        missing.length > 0 ? `Missing: ${missing.join(', ')}` : '',
        unexpected.length > 0 ? `Unexpected: ${unexpected.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join(' '),
    )
  }
}

function assertNoLegacyNamesInAssetModule() {
  const assetModulePath = join(projectRoot, 'src', 'landing', 'assets.ts')
  const source = readFileSync(assetModulePath, 'utf8')
  const legacyName = legacyNames.find((name) => source.includes(name))
  if (legacyName) {
    fail(`Legacy asset route found in src/landing/assets.ts: ${legacyName}`)
  }
}

try {
  const manifest = readManifest()
  const expectedFiles = manifestFiles(manifest)
  assertPublicDirectoryMatches(expectedFiles)
  assertNoLegacyNamesInAssetModule()
  console.log(`Verified ${expectedFiles.length} unique official assets.`)
} catch (error) {
  console.error(`Asset verification failed: ${error.message}`)
  process.exitCode = 1
}
