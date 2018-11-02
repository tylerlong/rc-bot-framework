import path from 'path'

import S3Database from './S3Database'
import FileDatabase from './FileDatabase'

let database
if (process.env.AWS_S3_BUCKET) {
  database = new S3Database({
    bucket: process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET,
    key: process.env.RINGCENTRAL_BOT_DATABASE_S3_KEY
  })
} else {
  database = new FileDatabase({ file: path.join('..', process.env.RINGCENTRAL_BOT_DATABASE_FILE) })
}

export default database
