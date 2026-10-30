import fs from 'fs'
import net from 'net'
import { Client } from 'ssh2'
import { Session } from '../lib/sesstion.js'

export class SshSession extends Session {
  private client: Client
  private jumpClient?: Client
  private sftpService: any
  private monitoringService: any
  private cols = 80
  private rows = 24

  constructor(id: string, config: any, sftpService?: any, monitoringService?: any) {
    super()
    this.cols = config.cols || 80
    this.rows = config.rows || 24
    this.client = new Client()
    this.sftpService = sftpService
    this.monitoringService = monitoringService

    this.client.on('ready', () => {
      // Register SSH client with services
      if (this.sftpService) {
        this.sftpService.registerSshClient(id, this.client)
      }
      if (this.monitoringService) {
        this.monitoringService.registerSshClient(id, this.client)
      }

      // Setup X11 forwarding if enabled
      if (config.x11Forwarding) {
        this.emit('data', '\r\nEnabling X11 forwarding...\r\n')

        this.client.on('x11', (info: any, accept: any, reject: any) => {
          const xserversock = new net.Socket()

          xserversock.on('connect', () => {
            const xclientsock = accept()
            xclientsock.pipe(xserversock).pipe(xclientsock)
          })

          xserversock.on('error', (err: any) => {
            console.error('X11 socket error:', err)
            this.emit('data', `\r\nX11 connection error: ${err.message}\r\n`)
            reject()
          })

          // Connect to local X11 server
          // Display format: hostname:displaynumber.screennumber
          // Default display is :0 on Unix-like systems
          const display = config.x11Display || process.env.DISPLAY || ':0'
          const displayMatch = display.match(/^(.*):(\d+)(?:\.(\d+))?$/)

          if (displayMatch) {
            const xHost = displayMatch[1] || 'localhost'
            const xPort = 6000 + parseInt(displayMatch[2])
            xserversock.connect(xPort, xHost)
          } else {
            console.error('Invalid X11 display format:', display)
            this.emit('data', `\r\nInvalid X11 display format: ${display}\r\n`)
            reject()
          }
        })
      }

      // Shell options for X11
      const shellOptions: any = {}
      if (config.x11Forwarding) {
        shellOptions.x11 = {
          single: false,
          screen: 0,
        }
      }

      this.client.shell(
        { term: 'xterm-256color', cols: this.cols, rows: this.rows },
        shellOptions,
        (err: any, stream: any) => {
          if (err) {
            this.emit('data', `\r\n\x1b[1;31m✖ Failed to open shell: \x1b[0m${err.message}\r\n\r\n`)
            this.emit('exit', { exitCode: 1, signal: 'ERROR' })
            return
          }

          this.stream = stream

          stream.on('close', (code: any, signal: any) => {
            this.client.end()
            this.emit('exit', { exitCode: code, signal })
          })

          stream.on('data', (data: any) => {
            this.emit('data', data.toString())
          })

          stream.stderr.on('data', (data: any) => {
            this.emit('data', data.toString())
          })
        }
      )
    })

    const onError = (err: any) => {
      this.jumpClient?.end()
      this.emit('data', '\r\n\x1b[1;31m╔═══════════════════════════════════════════╗\r\n')
      this.emit('data', '\x1b[1;31m║     SSH CONNECTION ERROR                  ║\r\n')
      this.emit('data', '\x1b[1;31m╚═══════════════════════════════════════════╝\x1b[0m\r\n')
      this.emit('data', `\x1b[1;33m⚠  Error: \x1b[0m${err.message}\r\n`)

      // Provide helpful hints based on error type
      if (err.message.includes('ECONNREFUSED')) {
        this.emit('data', '\x1b[36m💡 Hint: Check if SSH service is running on the remote host\r\n')
      } else if (err.message.includes('ENOTFOUND') || err.message.includes('getaddrinfo')) {
        this.emit('data', '\x1b[36m💡 Hint: Check the hostname/IP address\r\n')
      } else if (err.message.includes('ETIMEDOUT')) {
        this.emit('data', '\x1b[36m💡 Hint: Check network connectivity and firewall settings\r\n')
      } else if (err.message.includes('authentication')) {
        this.emit('data', '\x1b[36m💡 Hint: Verify your username, password, or SSH key\r\n')
      }

      this.emit('data', '\x1b[0m\r\n')
      this.emit('exit', { exitCode: 1, signal: 'ERROR' })
    }
    this.client.on('error', onError)
    this.client.on('keyboard-interactive', this.answerPrompts(config.password))

    this.client.on('close', () => {
      // Stream close usually handles the exit, but the jump tunnel must always go down too
      this.jumpClient?.end()
    })

    try {
      // Validate required fields
      if (!config.host) {
        this.emit('data', '\r\n\x1b[1;31m✖ Error: Host is required\x1b[0m\r\n')
        this.emit('exit', { exitCode: 1, signal: 'ERROR' })
        return
      }

      const connectConfig = this.buildConnectConfig(config)
      if (!connectConfig) return

      this.emit(
        'data',
        `\r\n\x1b[1;32m⚡ Connecting to ${connectConfig.username}@${connectConfig.host}:${connectConfig.port}...\x1b[0m\r\n`
      )

      if (config.jump) {
        const jumpConfig = this.buildConnectConfig(config.jump)
        if (!jumpConfig) return

        // The jump host only tunnels; the target handshake runs over the forwarded stream
        const jump = new Client()
        this.jumpClient = jump
        jump.on('error', onError)
        jump.on('keyboard-interactive', this.answerPrompts(config.jump.password))
        jump.on('ready', () => {
          jump.forwardOut('127.0.0.1', 0, connectConfig.host, connectConfig.port, (err, sock) => {
            if (err) return onError(err)
            this.client.connect({ ...connectConfig, sock })
          })
        })
        jump.connect(jumpConfig)
      } else {
        this.client.connect(connectConfig)
      }
    } catch (err: any) {
      setTimeout(() => {
        this.emit('data', '\r\n\x1b[1;31m╔═══════════════════════════════════════════╗\r\n')
        this.emit('data', '\x1b[1;31m║     CONNECTION FAILED                     ║\r\n')
        this.emit('data', '\x1b[1;31m╚═══════════════════════════════════════════╝\x1b[0m\r\n')
        this.emit('data', `\x1b[1;33m⚠  Error: \x1b[0m${err.message}\r\n\r\n`)
        this.emit('exit', { exitCode: 1, signal: 'ERROR' })
      }, 100)
    }
  }

  // Answer every keyboard-interactive prompt with the stored password
  private answerPrompts(password?: string) {
    return (_name: string, _instructions: string, _lang: string, prompts: any[], finish: any) =>
      finish(prompts.map(() => password || ''))
  }

  // Auth settings shared by the target and the jump host; null after reporting an error
  private buildConnectConfig(config: any): any {
    const connectConfig: any = {
      host: config.host,
      port: config.port || 22,
      username: config.username || 'root',
      tryKeyboard: true,
      readyTimeout: 20000,
      keepaliveInterval: 15000,
    }

    if (config.authType === 'password') {
      if (config.password) {
        connectConfig.password = config.password
      } else {
        this.emit('data', '\r\nWarning: No password provided for password authentication\r\n')
      }
    } else if (config.authType === 'privateKey') {
      if (config.privateKeyContent) {
        connectConfig.privateKey = config.privateKeyContent
      } else if (config.privateKeyPath) {
        // We need to read the file here or assume it was passed as content.
        // Ideally the UI/Service reads it.
        // But `ssh2` can take a path? No, it takes a Buffer or string.
        // We should read it in PtyService or pass it here.
        // Let's assume PtyService reads it or we read it here.
        // Since we are in Main process, we can read fs.
        try {
          connectConfig.privateKey = fs.readFileSync(config.privateKeyPath)
          console.log('Successfully read private key from:', config.privateKeyPath)
        } catch (e: any) {
          this.emit('data', `\r\n\x1b[1;31m✖ Error reading private key:\x1b[0m ${e.message}\r\n`)
          this.emit(
            'data',
            '\x1b[36m💡 Hint: Check if the key file exists and has correct permissions\x1b[0m\r\n\r\n'
          )
          this.emit('exit', { exitCode: 1, signal: 'ERROR' })
          return null
        }
      } else {
        this.emit(
          'data',
          '\r\n\x1b[1;31m✖ Error: Private key path or content is required for key authentication\x1b[0m\r\n'
        )
        this.emit('exit', { exitCode: 1, signal: 'ERROR' })
        return null
      }

      if (config.passphrase) {
        connectConfig.passphrase = config.passphrase
      }
    } else if (config.authType === 'agent') {
      const agent =
        process.platform === 'win32' ? '\\\\.\\pipe\\openssh-ssh-agent' : process.env.SSH_AUTH_SOCK
      if (!agent) throw new Error('SSH_AUTH_SOCK is not set, start ssh-agent first')
      connectConfig.agent = agent
      if (config.agentForward) connectConfig.agentForward = true
    } else {
      // Default to password if authType not specified
      this.emit(
        'data',
        '\r\nWarning: No authentication type specified, attempting password auth\r\n'
      )
      if (config.password) {
        connectConfig.password = config.password
      }
    }
    return connectConfig
  }

  write(data: string): void {
    if (this.stream) {
      this.stream.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    this.cols = cols
    this.rows = rows
    if (this.stream) {
      this.stream.setWindow(rows, cols, 0, 0)
    }
  }

  kill(): void {
    if (this.stream) {
      this.stream.end()
    }
    this.client.end()
    this.jumpClient?.end()
  }
}
