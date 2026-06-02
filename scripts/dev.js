import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkInterfaces } from 'node:os'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const port = '5173'

function getLanUrls() {
  return Object.values(networkInterfaces())
    .flat()
    .filter(address => address?.family === 'IPv4' && !address.internal)
    .map(address => `http://${address.address}:${port}`)
}

const lanUrls = getLanUrls()
if (lanUrls.length > 0) {
  console.log(`Open on your phone: ${lanUrls[0]}`)
  console.log('Make sure the phone is on the same Wi-Fi as this computer.')
}

const children = [
  spawn(process.execPath, ['index.js'], {
    cwd: join(root, 'server'),
    stdio: 'inherit',
    shell: false,
  }),
  spawn(process.execPath, [join(root, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '0.0.0.0', '--port', port], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  }),
]

let shuttingDown = false

function stopAll(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) {
    if (!child.killed) child.kill()
  }
  process.exit(code)
}

for (const child of children) {
  child.on('exit', code => {
    if (!shuttingDown) stopAll(code ?? 0)
  })
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
