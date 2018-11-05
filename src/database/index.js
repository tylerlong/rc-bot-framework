import path from 'path'

import S3Database from './S3Database'
import FileDatabase from './FileDatabase'

const sugerMixins = {
  async getBot (id) {
    return this.getItem('bots', id)
  },
  async getUser (id) {
    return this.getItem('users', id)
  },
  async putBot (json) {
    await this.putItem('bots', json)
  },
  async putUser (json) {
    await this.putItem('users', json)
  },
  async deleteBot (id) {
    await this.deleteItem('bots', id)
  },
  async deleteUser (id) {
    await this.deleteItem('users', id)
  }
}

const fileMixins = {
  async getItem (table, id) {
    const db = await this.read()
    if (db[table] && db[table][id]) {
      return { ...db[table][id], id }
    }
  },
  async putItem (table, json) {
    const db = await this.read()
    if (!db[table]) {
      db[table] = {}
    }
    db[table][json.id] = json
    await this.write(db)
  },
  async deleteItem (table, id) {
    const db = await this.read()
    delete db[table][id]
    await this.write(db)
  }
}

let database
if (process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET) {
  Object.assign(S3Database.prototype, sugerMixins)
  Object.assign(S3Database.prototype, fileMixins)
  database = new S3Database({
    Bucket: process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET,
    Key: process.env.RINGCENTRAL_BOT_DATABASE_S3_KEY
  })
} else {
  Object.assign(FileDatabase.prototype, sugerMixins)
  Object.assign(FileDatabase.prototype, fileMixins)
  database = new FileDatabase({ file: path.join('..', process.env.RINGCENTRAL_BOT_DATABASE_FILE) })
}

export default database
