import { EventEmitter } from 'events'

export interface ISession extends EventEmitter {
  write(data: string): void
  resize(cols: number, rows: number): void
  kill(): void
}

export class Session extends EventEmitter implements ISession {
  stream?: any

  write(data: string): void {
    this.stream.write(data)
  }

  resize(cols: number, rows: number): void {
    this.stream.resize(cols, rows)
  }

  kill(): void {
    this.stream.end()
  }
}
