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

  async getItem (table, id) {
    const db = await this.read()
    if (db[table] && db[table][id]) {
      return { ...db[table][id], id }
    }
  }
  async getBot (id) {
    return this.getItem('bots', id)
  }
  async getUser (id) {
    return this.getItem('users', id)
  }

  async putItem (table, json) {
    const db = await this.read()
    if (!db[table]) {
      db[table] = {}
    }
    db[table][json.id] = json
    await this.write(db)
  }
  async putBot (json) {
    await this.putItem('bots', json)
  }
  async putUser (json) {
    await this.putItem('users', json)
  }

  async deleteItem (table, id) {
    const db = await this.read()
    delete db[table][id]
    await this.write(db)
  }
  async deleteBot (id) {
    await this.deleteItem('bots', id)
  }
  async deleteUser (id) {
    await this.deleteItem('users', id)
  }
}

export default FileDatabase
