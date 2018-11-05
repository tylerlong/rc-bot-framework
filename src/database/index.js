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

let database
if (process.env.AWS_S3_BUCKET) {
  database = new S3Database({
    bucket: process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET,
    key: process.env.RINGCENTRAL_BOT_DATABASE_S3_KEY
  })
} else {
  Object.assign(FileDatabase.prototype, sugerMixins)
  database = new FileDatabase({ file: path.join('..', process.env.RINGCENTRAL_BOT_DATABASE_FILE) })
}

export default database
