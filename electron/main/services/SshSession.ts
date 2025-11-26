import { EventEmitter } from 'events'
import fs from 'fs'
import net from 'net'
import { Client } from 'ssh2'

export interface Session extends EventEmitter {
  id: string
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

export class SshSession extends EventEmitter implements Session {
  public id: string
  private client: Client
  private stream: any
  private sftpService: any
  private monitoringService: any

  constructor(id: string, config: any, sftpService?: any, monitoringService?: any) {
    super()
    this.id = id
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

      this.client.shell(shellOptions, (err: any, stream: any) => {
        if (err) {
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
      })
    })

    this.client.on('error', (err: any) => {
      this.emit('data', `\r\nSSH Connection Error: ${err.message}\r\n`)
      this.emit('exit', { exitCode: 1, signal: 'ERROR' })
    })

    this.client.on('close', () => {
      // Handled by stream close usually, but good backup
    })

    try {
      // Validate required fields
      if (!config.host) {
        this.emit('data', '\r\nError: Host is required\r\n')
        this.emit('exit', { exitCode: 1, signal: 'ERROR' })
        return
      }

      const connectConfig: any = {
        host: config.host,
        port: config.port || 22,
        username: config.username || 'root',
      }

      // Debug log (can be removed in production)
      console.log('SSH Connection Config:', {
        host: connectConfig.host,
        port: connectConfig.port,
        username: connectConfig.username,
        authType: config.authType,
      })

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
            this.emit('data', `\r\nError reading private key: ${e.message}\r\n`)
            this.emit('exit', { exitCode: 1, signal: 'ERROR' })
            return
          }
        } else {
          this.emit(
            'data',
            '\r\nError: Private key path or content is required for key authentication\r\n'
          )
          this.emit('exit', { exitCode: 1, signal: 'ERROR' })
          return
        }

        if (config.passphrase) {
          connectConfig.passphrase = config.passphrase
        }
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

      this.emit(
        'data',
        `\r\nConnecting to ${connectConfig.username}@${connectConfig.host}:${connectConfig.port}...\r\n`
      )
      this.client.connect(connectConfig)
    } catch (err: any) {
      setTimeout(() => {
        this.emit('data', `\r\nConnection failed: ${err.message}\r\n`)
        this.emit('exit', { exitCode: 1, signal: 'ERROR' })
      }, 100)
    }
  }

  write(data: string): void {
    if (this.stream) {
      this.stream.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    if (this.stream) {
      this.stream.setWindow(rows, cols, 0, 0)
    }
  }

  kill(): void {
    if (this.stream) {
      this.stream.end()
    }
    this.client.end()
  }
}
