import path from 'path'
import fs from 'fs'
import AWS from 'aws-sdk'
import { promisify } from 'util'

const fsAccess = promisify(fs.access)
const fsWriteFile = promisify(fs.writeFile)
const fsReadFile = promisify(fs.readFile)

const s3 = new AWS.S3()

class Database {
  constructor (options) {
    if (new.target === Database) {
      throw new TypeError('"Cannot construct Abstract instances directly')
    }
    for (const key of Object.keys(options)) {
      this[key] = options[key]
    }
  }
}

export class FileDatabase extends Database {
  constructor (options) {
    super(options)
    if (!this.file) {
      throw new TypeError(`Please specify valid file like this: \`new FileDatabase({ file: '...' })\``)
    }
    if (path.isAbsolute(this.file)) {
      this.databaseUri = this.file
    } else {
      this.databaseUri = path.join(__dirname, this.file)
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
}

export class S3Database extends Database {
  constructor (options) {
    super(options)
    if (!this.bucket || !this.key) {
      throw new TypeError(`Please specify valid bucket and key like this: \`new S3Database({ bucket: '...', key: '...' })\``)
    }
    this.options = { Bucket: this.bucket, Key: this.key }
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
