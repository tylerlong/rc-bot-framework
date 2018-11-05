import path from 'path'

import S3Database from './S3Database'
import FileDatabase from './FileDatabase'

let database
if (process.env.RINGCENTRAL_BOT_DATABASE_FILE) {
  database = new FileDatabase({ file: path.join('..', process.env.RINGCENTRAL_BOT_DATABASE_FILE) })
} else if (process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET) {
  database = new S3Database({
    Bucket: process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET,
    Key: process.env.RINGCENTRAL_BOT_DATABASE_S3_KEY
  })
} else {
  throw new Error('Cannot find database configuration')
}

export default database
