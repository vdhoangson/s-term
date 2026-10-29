export interface SshConfigHost {
  alias: string
  host: string
  user?: string
  port?: number
  identityFile?: string
  proxyJump?: string
}

// shortcut: Match blocks and Include are ignored, add them if users ask
export function parseSshConfig(text: string, home: string): SshConfigHost[] {
  const hosts: SshConfigHost[] = []
  const hostNames = new Map<SshConfigHost, string>()
  let current: SshConfigHost[] = []

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    const m = line.match(/^(\w+)(?:\s*=\s*|\s+)(.+)$/)
    if (!m) continue
    const key = m[1].toLowerCase()
    const value = m[2].trim().replace(/^"(.*)"$/, '$1')

    if (key === 'host') {
      current = value
        .split(/\s+/)
        .filter(alias => !/[*?!]/.test(alias))
        .map(alias => ({ alias, host: alias }))
      hosts.push(...current)
    } else if (key === 'match') {
      current = []
    } else {
      // Like OpenSSH, the first value found for a keyword wins
      for (const h of current) {
        if (key === 'hostname') hostNames.set(h, hostNames.get(h) ?? value)
        else if (key === 'user') h.user ??= value
        else if (key === 'port') h.port ??= parseInt(value) || undefined
        else if (key === 'identityfile') h.identityFile ??= value.replace(/^~(?=[\\/]|$)/, home)
        else if (key === 'proxyjump' && value.toLowerCase() !== 'none')
          h.proxyJump ??= value.split(',')[0].trim()
      }
    }
  }

  for (const h of hosts) h.host = hostNames.get(h) ?? h.alias
  return hosts
}
