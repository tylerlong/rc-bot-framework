import path from 'path'

import S3Database from './S3Database'
import FileDatabase from './FileDatabase'
import DynamoDB from './DynamoDB'

let database
if (process.env.RINGCENTRAL_BOT_DATABASE_FILE) {
  database = new FileDatabase({ file: path.join('..', process.env.RINGCENTRAL_BOT_DATABASE_FILE) })
} else if (process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET) {
  database = new S3Database({
    Bucket: process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET,
    Key: process.env.RINGCENTRAL_BOT_DATABASE_S3_KEY
  })
} else if (process.env.RINGCENTRAL_BOT_DYNAMODB_TABLE_NAME_PREFIX) {
  database = new DynamoDB({
    tableNamePrefix: process.env.RINGCENTRAL_BOT_DYNAMODB_TABLE_NAME_PREFIX
  })
} else {
  throw new Error('Cannot find database configuration')
}

export default database
