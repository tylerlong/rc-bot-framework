import AWS from 'aws-sdk'

const s3 = new AWS.S3()

class S3Database {
  constructor (options) {
    if (!options.Bucket || !options.Key) {
      throw new TypeError(`Please specify valid \`Bucket\` and \`Key\` like this: \`new S3Database({ Bucket: '...', Key: '...' })\``)
    }
    this.options = options
  }

  async ensureBucket () {
    try {
      await s3.headBucket(this.options).promise()
    } catch (e) {
      if (e.statusCode === 404) {
        await s3.createBucket(this.options).promise()
      } else {
        throw e
      }
    }
  }
  async ensureKey () {
    try {
      await s3.headObject(this.options).promise()
    } catch (e) {
      if (e.code === 'NotFound') {
        await s3.putObject({ ...this.options, Body: '{}' }).promise()
      } else {
        throw e
      }
    }
  }

  async read () {
    await this.ensureBucket()
    await this.ensureKey()
    const str = await s3.getObject(this.options).promise()
    return JSON.parse(str)
  }

  async write (json) {
    await this.ensureBucket()
    await s3.putObject({ ...this.options, Body: JSON.stringify(json, null, 2) }).promise()
  }
}

export default S3Database
