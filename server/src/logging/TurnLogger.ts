import * as fs from 'fs'
import * as path from 'path'
import { TurnLogRecord } from '../game/types'

const LOG_DIR = path.resolve(process.cwd(), 'logs', 'turns')

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export class TurnLogger {
  private filePath: string
  private stream: fs.WriteStream

  constructor(gameId: string) {
    ensureDir(LOG_DIR)
    this.filePath = path.join(LOG_DIR, `${gameId}.jsonl`)
    this.stream = fs.createWriteStream(this.filePath, { flags: 'a' })
  }

  write(record: TurnLogRecord) {
    this.stream.write(JSON.stringify(record) + '\n')
  }

  close() {
    this.stream.end()
  }

  get path() { return this.filePath }
}
