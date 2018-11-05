import AWS from 'aws-sdk'

import suger from './mixins/suger'
import file from './mixins/file'

const s3 = new AWS.S3()

class S3Database {
  constructor (options) {
    if (!options.Bucket || !options.Key) {
      throw new TypeError(`Please specify valid \`Bucket\` and \`Key\` like this: \`new S3Database({ Bucket: '...', Key: '...' })\``)
    }
    this.bucketParams = { Bucket: options.Bucket }
    this.objectParams = { Bucket: options.Bucket, Key: options.Key }
  }

  async ensureBucket () {
    try {
      await s3.headBucket(this.bucketParams).promise()
    } catch (e) {
      if (e.statusCode === 404) {
        await s3.createBucket(this.bucketParams).promise()
      } else {
        throw e
      }
    }
  }
  async ensureKey () {
    try {
      await s3.headObject(this.objectParams).promise()
    } catch (e) {
      if (e.code === 'NotFound') {
        await s3.putObject({ ...this.objectParams, Body: '{}' }).promise()
      } else {
        throw e
      }
    }
  }

  async read () {
    await this.ensureBucket()
    await this.ensureKey()
    const data = await s3.getObject(this.objectParams).promise()
    const str = data.Body.toString('utf8')
    return JSON.parse(str)
  }

  async write (json) {
    await this.ensureBucket()
    await s3.putObject({ ...this.objectParams, Body: JSON.stringify(json, null, 2) }).promise()
  }
}

Object.assign(S3Database.prototype, suger)
Object.assign(S3Database.prototype, file)

export default S3Database
