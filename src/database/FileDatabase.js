import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

import suger from './mixins/suger'
import file from './mixins/file'

const fsAccess = promisify(fs.access)
const fsWriteFile = promisify(fs.writeFile)
const fsReadFile = promisify(fs.readFile)

class FileDatabase {
  constructor (options) {
    if (!options.file) {
      throw new TypeError(`Please specify valid file like this: \`new FileDatabase({ file: '...' })\``)
    }
    if (path.isAbsolute(options.file)) {
      this.databaseUri = options.file
    } else {
      this.databaseUri = path.join(__dirname, '..', options.file)
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

Object.assign(FileDatabase.prototype, suger)
Object.assign(FileDatabase.prototype, file)

export default FileDatabase
