#!/usr/bin/env node
/**
 * Post-process TypeDoc markdown for Starlight + emit llms.txt / changelog page.
 */
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const apiRoot = path.join(root, 'docs-site/src/content/docs/api')
const publicDir = path.join(root, 'docs-site/public')
const guidesDir = path.join(root, 'docs-site/src/content/docs/guides')

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, files)
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) files.push(full)
  }
  return files
}

function cleanTitle(filePath, body) {
  const h1 = body.match(/^#\s+(.+)$/m)
  let raw = h1 ? h1[1].replace(/\\/g, '').trim() : path.basename(filePath, path.extname(filePath))
  raw = raw
    .replace(/^(Variable|Function|Class|Interface|Type alias|Enumeration|Namespace):\s*/i, '')
    .trim()
  if (raw === 'index' || raw === '@mobilelocker/javascript-sdk') {
    const parent = path.basename(path.dirname(filePath))
    if (parent === 'api') return 'API overview'
    return parent
  }
  return raw
}

function toPosix(p) {
  return p.split(path.sep).join('/')
}

function relLink(fromFile, targetAbsUrl) {
  let target = targetAbsUrl.replace(/\.md$/i, '').replace(/\/$/, '')
  if (target.startsWith('/api/')) {
    target = target.slice(1)
  } else if (!target.startsWith('api/')) {
    return targetAbsUrl
  }
  const fromDir = path.dirname(fromFile)
  const fromUrlDir = path.relative(path.join(root, 'docs-site/src/content/docs'), fromDir)
  const fromParts = toPosix(fromUrlDir).split('/').filter(Boolean)
  const baseName = path.basename(fromFile, '.md')
  const fromUrlParts = [...fromParts]
  if (baseName !== 'index') {
    fromUrlParts.push(baseName)
  }
  const targetParts = target.split('/').filter(Boolean)
  const rel = path.posix.relative(fromUrlParts.join('/') || '.', targetParts.join('/'))
  return (rel || '.') + '/'
}

function cleanLinks(body, filePath) {
  return body.replace(/\]\(([^)]+?)\)/g, (full, url) => {
    if (url.startsWith('http') || url.startsWith('#') || url.startsWith('mailto:')) return full
    let [pathPart, hash] = url.split('#')
    hash = hash ? `#${hash}` : ''
    pathPart = pathPart.replace(/\.md$/i, '')
    if (pathPart.startsWith('/api/') || pathPart.startsWith('api/')) {
      const rel = relLink(filePath, pathPart.startsWith('/') ? pathPart : `/${pathPart}`)
      return `](${rel}${hash})`
    }
    if (pathPart.endsWith('.md')) {
      return `](${pathPart.replace(/\.md$/, '/')}${hash})`
    }
    return full
  })
}

function stripFrontmatter(body) {
  if (body.startsWith('---\n')) {
    return body.replace(/^---\n[\s\S]*?\n---\n+/, '')
  }
  return body
}

function pageDescription(title, body) {
  for (const line of body.split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || t.startsWith('|') || t.startsWith('```') || t.startsWith('Defined in')) {
      continue
    }
    if (/^(const|function|class|type|interface|export)\b/.test(t)) {
      return `API reference: ${title}`
    }
    return t.replace(/"/g, '\\"').slice(0, 160)
  }
  return `API reference: ${title}`
}

function prepareApiPages() {
  let updated = 0
  for (const file of walk(apiRoot).filter((f) => f.endsWith('.md'))) {
    let body = stripFrontmatter(fs.readFileSync(file, 'utf8'))
    const title = cleanTitle(file, body).replace(/"/g, '\\"')
    body = body.replace(/^#\s+.+\n+/, '')
    body = cleanLinks(body, file)
    const description = pageDescription(title, body)
    const next = `---\ntitle: "${title}"\ndescription: "${description}"\neditUrl: false\n---\n\n${body}`
    fs.writeFileSync(file, next)
    updated++
  }
  console.log(`Prepared ${updated} API page(s)`)
}

function writeChangelogPage() {
  const src = path.join(root, 'CHANGELOG.md')
  if (!fs.existsSync(src)) {
    console.warn('CHANGELOG.md not found — skip')
    return
  }
  let body = fs.readFileSync(src, 'utf8')
  body = body.replace(/^#\s+Changelog\s*\n+/, '')
  const out = path.join(guidesDir, 'changelog.md')
  fs.writeFileSync(
    out,
    `---\ntitle: Changelog\ndescription: Release notes for the Mobile Locker JavaScript SDK.\neditUrl: false\n---\n\n${body}`,
  )
  console.log('Wrote guides/changelog.md from CHANGELOG.md')
}

function writeLlmsTxt() {
  fs.mkdirSync(publicDir, { recursive: true })
  const lines = [
    '# Mobile Locker JavaScript SDK',
    '',
    '> Official JavaScript SDK for building interactive presentations and custom features on the Mobile Locker platform.',
    '',
    'Package: `@mobilelocker/javascript-sdk`. Official SDK for Mobile Locker presentations (CRM, contacts, scanner, storage, and more).',
    '',
    '## Guides',
    '- [Install](guides/install/): npm and package install',
    '- [Getting started](guides/getting-started/): first success path',
    '- [UMD in presentation HTML](guides/umd-html/): script-tag usage in presentations',
    '- [Environments](guides/environments/): isIOS, isAndroid, isWindows, isElectron, isCDN, isApp',
    '- [Changelog](guides/changelog/): release notes',
    '',
    '## Examples',
    '- [Examples overview](examples/)',
    '- [SDK Demo IVA](examples/demo-iva/): companion IVA for this SDK (use in Mobile Locker app; source https://github.com/mobilelocker/mobilelocker-sdk-demo)',
    '',
    '## Domains',
    '- [Domains overview](domains/): map of every module',
    '- [Analytics](domains/analytics/)',
    '- [Congresses](domains/congresses/)',
    '- [Contacts](domains/contacts/): cursor-paged address book',
    '- [CRM](domains/crm/): SOQL and cursor paging',
    '- [Data](domains/data/)',
    '- [Database](domains/database/)',
    '- [Device](domains/device/)',
    '- [Errors](domains/errors/)',
    '- [HTTP](domains/http/)',
    '- [localforage](domains/localforage/)',
    '- [Log](domains/log/)',
    '- [Network](domains/network/)',
    '- [Permissions](domains/permissions/)',
    '- [Presentation](domains/presentation/)',
    '- [Scanner](domains/scanner/)',
    '- [Search](domains/search/)',
    '- [Session](domains/session/)',
    '- [Share](domains/share/)',
    '- [Storage](domains/storage/)',
    '- [UI](domains/ui/)',
    '- [User](domains/user/)',
    '',
    '## API modules',
  ]

  const modulesDir = path.join(apiRoot, 'variables')
  if (fs.existsSync(modulesDir)) {
    for (const name of fs.readdirSync(modulesDir).sort()) {
      if (!name.endsWith('.md')) continue
      const slug = name.replace(/\.md$/, '')
      lines.push(`- [${slug}](api/variables/${slug}/)`)
    }
  }

  lines.push('')
  lines.push('## Full API tree')
  lines.push('- [API overview](api/)')
  lines.push('')

  fs.writeFileSync(path.join(publicDir, 'llms.txt'), lines.join('\n'))
  console.log('Wrote public/llms.txt')
}

prepareApiPages()
writeChangelogPage()
writeLlmsTxt()
