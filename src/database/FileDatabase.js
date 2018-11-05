import path from 'path'
import fs from 'fs'
import { promisify } from 'util'

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

  async getItem (table, id) {
    const db = await this.read()
    if (db[table] && db[table][id]) {
      return { ...db[table][id], id }
    }
  }
  async putItem (table, json) {
    const db = await this.read()
    if (!db[table]) {
      db[table] = {}
    }
    db[table][json.id] = json
    await this.write(db)
  }
  async deleteItem (table, id) {
    const db = await this.read()
    delete db[table][id]
    await this.write(db)
  }
}

export default FileDatabase
