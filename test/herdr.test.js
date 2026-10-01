import assert from 'node:assert/strict'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { request, socketAddress } from '../server/herdr.js'

test('Windows talks to herdr over the named pipe herdr derives from the socket path', () => {
  assert.equal(socketAddress('C:\\Users\\me\\.config\\herdr\\herdr.sock', 'win32'), '\\\\.\\pipe\\C:\\Users\\me\\.config\\herdr\\herdr.sock')
  assert.equal(socketAddress('/home/me/.config/herdr/herdr.sock', 'linux'), '/home/me/.config/herdr/herdr.sock')
})

// Runs on every OS in CI: a Unix socket on Linux/macOS, a real named pipe on Windows.
test('request() round-trips one JSON line over the platform socket', async () => {
  process.env.HERDR_SOCKET_PATH = path.join(os.tmpdir(), `hw-${process.pid}.sock`)
  const server = net.createServer((conn) => {
    conn.once('data', (d) => {
      const { id, method } = JSON.parse(String(d))
      conn.end(JSON.stringify({ id, result: { type: 'pong', method } }) + '\n')
    })
  })
  await new Promise((resolve) => server.listen(socketAddress(), resolve))
  try {
    assert.deepEqual(await request('ping'), { type: 'pong', method: 'ping' })
  } finally {
    server.close()
    delete process.env.HERDR_SOCKET_PATH
  }
})
