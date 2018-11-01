import SubX from 'subx'
import { debounceTime } from 'rxjs/operators'
import path from 'path'

import FileDatabase from '../database/FileDatabase'
import S3Database from '../database/S3Database'
import Store from './Store'

let database
if (process.env.AWS_S3_BUCKET) {
  database = new S3Database({
    bucket: process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET,
    key: process.env.RINGCENTRAL_BOT_DATABASE_S3_KEY
  })
} else {
  database = new FileDatabase({ file: path.join('..', process.env.RINGCENTRAL_BOT_DATABASE_FILE) })
}

const store = new Store()

;(async () => {
  const json = await database.read()
  await store.init(json)
  SubX.autoRun(store, () => database.write(store), debounceTime(1000))
})()

export default store
