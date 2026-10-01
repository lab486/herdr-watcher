import assert from 'node:assert/strict'
import { test } from 'node:test'
import { checkRequest } from '../server/http.js'

const allowed = ['localhost', '127.0.0.1', '::1', 'mac.tail1234.ts.net']
const req = (method, host, origin) => ({ method, headers: { host, ...(origin && { origin }) } })

test('allows local and configured hosts', () => {
  assert.equal(checkRequest(req('GET', '127.0.0.1:7483'), allowed), null)
  assert.equal(checkRequest(req('GET', '[::1]:7483'), allowed), null)
  assert.equal(checkRequest(req('GET', 'mac.tail1234.ts.net'), allowed), null)
  assert.equal(checkRequest(req('POST', 'localhost:7483', 'http://localhost:7483'), allowed), null)
})

test('refuses unknown hosts (DNS rebinding)', () => {
  assert.match(checkRequest(req('GET', 'evil.example:7483'), allowed), /not allowed/)
  assert.match(checkRequest(req('GET', undefined), allowed), /not allowed/)
})

test('refuses cross-origin writes', () => {
  assert.match(checkRequest(req('POST', 'localhost:7483', 'https://evil.example'), allowed), /Cross-origin/)
  assert.match(checkRequest(req('POST', 'localhost:7483', 'http://localhost:9999'), allowed), /Cross-origin/)
  assert.match(checkRequest(req('POST', 'localhost:7483', 'null'), allowed), /Cross-origin/)
})
