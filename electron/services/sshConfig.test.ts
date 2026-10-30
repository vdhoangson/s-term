import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSshConfig } from './sshConfig.ts'

const home = '/home/me'

test('multiple aliases on one Host line give one entry each', () => {
  const hosts = parseSshConfig('Host web1 web2\n  HostName example.com\n  User deploy\n', home)
  assert.deepEqual(hosts, [
    { alias: 'web1', host: 'example.com', user: 'deploy' },
    { alias: 'web2', host: 'example.com', user: 'deploy' },
  ])
})

test('wildcard, negated and ? aliases are skipped and their block ignored', () => {
  const hosts = parseSshConfig(
    'Host *\n  User root\nHost *.corp !bad a?\n  Port 2200\nHost ok\n  HostName 10.0.0.1\n',
    home
  )
  assert.deepEqual(hosts, [{ alias: 'ok', host: '10.0.0.1' }])
})

test('host falls back to the alias without HostName', () => {
  assert.deepEqual(parseSshConfig('Host box\n', home), [{ alias: 'box', host: 'box' }])
})

test('key=value, case-insensitive keywords and numeric port', () => {
  const hosts = parseSshConfig('HOST a\n  hostname=1.2.3.4\n  USER = bob\n  port=2222\n', home)
  assert.deepEqual(hosts, [{ alias: 'a', host: '1.2.3.4', user: 'bob', port: 2222 }])
})

test('IdentityFile expands a leading ~ only', () => {
  const hosts = parseSshConfig(
    'Host a\n  IdentityFile ~/.ssh/id_a\nHost b\n  IdentityFile /keys/id_b\n',
    home
  )
  assert.equal(hosts[0].identityFile, '/home/me/.ssh/id_a')
  assert.equal(hosts[1].identityFile, '/keys/id_b')
})

test('ProxyJump keeps the first hop, alias or user@host:port', () => {
  const hosts = parseSshConfig(
    'Host a\n  ProxyJump bastion\nHost b\n  ProxyJump admin@jump.example.com:2222,other\nHost c\n  ProxyJump none\n',
    home
  )
  assert.equal(hosts[0].proxyJump, 'bastion')
  assert.equal(hosts[1].proxyJump, 'admin@jump.example.com:2222')
  assert.equal(hosts[2].proxyJump, undefined)
})

test('comments, blank lines, Match and Include are ignored', () => {
  const hosts = parseSshConfig(
    '# top\nInclude other.conf\n\nHost a\n  # inner\n  HostName a.example.com\nMatch host a\n  User ignored\n',
    home
  )
  assert.equal(hosts.length, 1)
  assert.equal(hosts[0].host, 'a.example.com')
  assert.equal(hosts[0].user, undefined)
})

test('first value wins for repeated keywords', () => {
  const [h] = parseSshConfig('Host a\n  User first\n  User second\n', home)
  assert.equal(h.user, 'first')
})
