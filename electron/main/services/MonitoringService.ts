import { ipcMain } from 'electron'

export interface SystemMetrics {
  cpu: number
  ramUsed: number
  ramTotal: number
  networkUp: number
  networkDown: number
  uptime: string
  diskUsage: number
  username: string
}

export class MonitoringService {
  private sshClients: Map<string, any> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.registerListeners()
  }

  public registerSshClient(sessionId: string, client: any) {
    this.sshClients.set(sessionId, client)
    console.log('Registered SSH client for monitoring:', sessionId)
  }

  public unregisterSshClient(sessionId: string) {
    this.stopMonitoring(sessionId)
    this.sshClients.delete(sessionId)
  }

  private registerListeners() {
    ipcMain.handle('monitoring:getMetrics', async (event, sessionId) => {
      return this.getMetrics(sessionId)
    })

    ipcMain.handle('monitoring:start', async (event, sessionId) => {
      return this.startMonitoring(sessionId)
    })

    ipcMain.handle('monitoring:stop', async (event, sessionId) => {
      return this.stopMonitoring(sessionId)
    })
  }

  private async executeCommand(sessionId: string, command: string): Promise<string> {
    const client = this.sshClients.get(sessionId)
    if (!client) {
      throw new Error('SSH client not found')
    }

    return new Promise((resolve, reject) => {
      client.exec(command, (err: any, stream: any) => {
        if (err) {
          reject(err)
          return
        }

        let output = ''
        stream.on('data', (data: any) => {
          output += data.toString()
        })

        stream.on('close', () => {
          resolve(output.trim())
        })

        stream.stderr.on('data', (data: any) => {
          console.error('Command error:', data.toString())
        })
      })
    })
  }

  private async getMetrics(sessionId: string): Promise<SystemMetrics> {
    try {
      // Execute commands in parallel
      const [cpu, ram, uptime, disk, username] = await Promise.all([
        this.getCpuUsage(sessionId),
        this.getRamUsage(sessionId),
        this.getUptime(sessionId),
        this.getDiskUsage(sessionId),
        this.getUsername(sessionId),
      ])

      // Network requires more complex tracking, simplified for now
      const network = { up: 0, down: 0 }

      return {
        cpu,
        ramUsed: ram.used,
        ramTotal: ram.total,
        networkUp: network.up,
        networkDown: network.down,
        uptime,
        diskUsage: disk,
        username,
      }
    } catch (error: any) {
      console.error('Failed to get metrics:', error)
      return {
        cpu: 0,
        ramUsed: 0,
        ramTotal: 0,
        networkUp: 0,
        networkDown: 0,
        uptime: 'N/A',
        diskUsage: 0,
        username: 'unknown',
      }
    }
  }

  private async getCpuUsage(sessionId: string): Promise<number> {
    try {
      // Using top command to get CPU usage
      const output = await this.executeCommand(
        sessionId,
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
      )
      return parseFloat(output) || 0
    } catch (error) {
      return 0
    }
  }

  private async getRamUsage(sessionId: string): Promise<{ used: number; total: number }> {
    try {
      // Using free command
      const output = await this.executeCommand(
        sessionId,
        'free -m | awk \'NR==2{printf "%.2f,%.2f", $3/1024, $2/1024}\''
      )
      const [used, total] = output.split(',').map(parseFloat)
      return { used: used || 0, total: total || 0 }
    } catch (error) {
      return { used: 0, total: 0 }
    }
  }

  private async getUptime(sessionId: string): Promise<string> {
    try {
      const output = await this.executeCommand(sessionId, 'uptime -p')
      return output.replace('up ', '') || 'N/A'
    } catch (error) {
      return 'N/A'
    }
  }

  private async getDiskUsage(sessionId: string): Promise<number> {
    try {
      const output = await this.executeCommand(
        sessionId,
        "df -h / | awk 'NR==2{print $5}' | sed 's/%//'"
      )
      return parseInt(output) || 0
    } catch (error) {
      return 0
    }
  }

  private async getUsername(sessionId: string): Promise<string> {
    try {
      const output = await this.executeCommand(sessionId, 'whoami')
      return output || 'unknown'
    } catch (error) {
      return 'unknown'
    }
  }

  private startMonitoring(sessionId: string): boolean {
    // Monitoring is handled by frontend polling
    // This is a placeholder for future auto-push implementation
    return true
  }

  private stopMonitoring(sessionId: string) {
    const interval = this.intervals.get(sessionId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(sessionId)
    }
  }
}
