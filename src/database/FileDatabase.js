import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

import Database from './Database'

const fsAccess = promisify(fs.access)
const fsWriteFile = promisify(fs.writeFile)
const fsReadFile = promisify(fs.readFile)

class FileDatabase extends Database {
  constructor (options) {
    super(options)
    if (!this.file) {
      throw new TypeError(`Please specify valid file like this: \`new FileDatabase({ file: '...' })\``)
    }
    if (path.isAbsolute(this.file)) {
      this.databaseUri = this.file
    } else {
      this.databaseUri = path.join(__dirname, '..', this.file)
    }
  }

  async ensure () {
    try {
      await fsAccess(this.databaseUri, fs.constants.F_OK)
    } catch (e) {
      await fsWriteFile(this.databaseUri, '{}')
    }
  }

  async read () {
    await this.ensure()
    const data = await fsReadFile(this.databaseUri, 'utf8')
    return JSON.parse(data)
  }

  async write (json) {
    await fsWriteFile(this.databaseUri, JSON.stringify(json, null, 2))
  }
}

export default FileDatabase
