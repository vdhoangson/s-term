import * as nodePTY from 'node-pty'
import os from 'os'
import { Session } from '../lib/sesstion.js'
import { UTF8Splitter } from '../lib/utfSplitter.js'
import { Subject } from 'rxjs'
import { debounceTime } from 'rxjs/operators'

class PTYDataQueue {
  private buffers: Buffer[] = []
  private delta = 0
  private maxChunk = 1024 * 100
  private maxDelta = this.maxChunk * 5
  private flowPaused = false
  private decoder = new UTF8Splitter()
  private output$ = new Subject<Buffer>()

  constructor(
    private pty: nodePTY.IPty,
    private onData: (data: Buffer) => void
  ) {
    this.output$.pipe(debounceTime(500)).subscribe(() => {
      const remainder = this.decoder.flush()
      if (remainder.length) {
        this.onData(remainder)
      }
    })
  }

  push(data: Buffer) {
    this.buffers.push(data)
    this.maybeEmit()
  }

  ack(length: number) {
    this.delta -= length
    this.maybeEmit()
  }

  private maybeEmit() {
    if (this.delta <= this.maxDelta && this.flowPaused) {
      this.resume()
      return
    }
    if (this.buffers.length > 0) {
      if (this.delta > this.maxDelta && !this.flowPaused) {
        this.pause()
        return
      }

      const buffersToSend: Buffer[] = []
      let totalLength = 0
      while (totalLength < this.maxChunk && this.buffers.length) {
        totalLength += this.buffers[0].length
        buffersToSend.push(this.buffers.shift()!)
      }

      if (buffersToSend.length === 0) {
        return
      }

      let toSend = Buffer.concat(buffersToSend)
      if (toSend.length > this.maxChunk) {
        this.buffers.unshift(toSend.slice(this.maxChunk))
        toSend = toSend.slice(0, this.maxChunk)
      }
      this.emitData(toSend)
      this.delta += toSend.length

      if (this.buffers.length) {
        setImmediate(() => this.maybeEmit())
      }
    }
  }

  private emitData(data: Buffer) {
    const validChunk = this.decoder.write(data)
    this.onData(validChunk)
    this.output$.next(validChunk)
  }

  private pause() {
    this.pty.pause()
    this.flowPaused = true
  }

  private resume() {
    this.pty.resume()
    this.flowPaused = false
    this.maybeEmit()
  }
}

export class LocalSession extends Session {
  private pty: nodePTY.IPty
  private outputQueue: PTYDataQueue

  constructor(id: string, options: any) {
    super()

    let shell = options.shell

    if (!shell) {
      if (os.platform() === 'win32') {
        shell = this.getWindowsShell()
      } else {
        shell = process.env.SHELL || '/bin/bash'
      }
    }

    // Ensure shell exists
    if (os.platform() === 'win32' && !shell.endsWith('.exe')) {
      // If just "powershell", try to find it
      if (shell === 'powershell') {
        shell = this.getWindowsShell()
      }
    }

    console.log(`[LocalSession] Spawning shell: ${shell}`)

    try {
      this.pty = nodePTY.spawn(shell, [], {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: process.env.HOME || process.env.USERPROFILE,
        env: process.env as any,
      })
    } catch (error) {
      console.error(`[LocalSession] Failed to spawn shell '${shell}':`, error)
      // Fallback for windows if powershell fails
      if (os.platform() === 'win32' && shell !== 'cmd.exe') {
        console.log('[LocalSession] Falling back to cmd.exe')
        try {
          this.pty = nodePTY.spawn('cmd.exe', [], {
            name: 'xterm-256color',
            cols: options.cols || 80,
            rows: options.rows || 24,
            cwd: process.env.HOME || process.env.USERPROFILE,
            env: process.env as any,
          })
        } catch (retryError) {
          console.error('[LocalSession] Failed to spawn fallback shell:', retryError)
          throw retryError
        }
      } else {
        throw error
      }
    }

    this.outputQueue = new PTYDataQueue(this.pty, data => {
      this.emit('data', data.toString())
    })

    this.pty.onData(data => {
      this.outputQueue.push(Buffer.from(data))
    })

    this.pty.onExit(({ exitCode, signal }) => {
      this.emit('exit', { exitCode, signal })
    })
  }

  write(data: string): void {
    this.pty.write(data)
  }

  resize(cols: number, rows: number): void {
    try {
      this.pty.resize(cols, rows)
    } catch (e) {
      console.error('Failed to resize PTY:', e)
    }
  }

  kill(): void {
    this.pty.kill()
  }

  // Needed for flow control acknowledgement
  ackData(length: number): void {
    this.outputQueue.ack(length)
  }

  private getWindowsShell(): string {
    const powerShellPath = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe'
    const pwshPath = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe'
    const cmdPath = process.env.COMSPEC || 'cmd.exe'

    if (require('fs').existsSync(pwshPath)) {
      return pwshPath
    }

    if (require('fs').existsSync(powerShellPath)) {
      return powerShellPath
    }

    return cmdPath
  }
}
