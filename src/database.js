import path from 'path'
import fs from 'fs'
import AWS from 'aws-sdk'

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
      this.file = 'database.json'
    }
    this.databaseUri = path.join(__dirname, this.file)
  }

  async ensure () {
    const exists = await new Promise((resolve, reject) => {
      fs.access(this.databaseUri, fs.constants.F_OK, e => {
        if (e) {
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
    if (!exists) {
      return new Promise((resolve, reject) => {
        fs.writeFile(this.databaseUri, '{}', e => {
          if (e) {
            reject(e)
          } else {
            resolve()
          }
        })
      })
    }
  }

  async read () {
    await this.ensure()
    const data = await new Promise((resolve, reject) => {
      fs.readFile(this.databaseUri, 'utf8', (e, data) => {
        if (e) {
          reject(e)
        } else {
          resolve(data)
        }
      })
    })
    return JSON.parse(data)
  }

  write (json) {
    return new Promise((resolve, reject) => {
      fs.writeFile(this.databaseUri, JSON.stringify(json, null, 2), e => {
        if (e) {
          reject(e)
        } else {
          resolve()
        }
      })
    })
  }
}

export class S3Database extends Database {
  constructor (options) {
    super(options)
    if (!this.bucket || !this.key) {
      throw new TypeError('Please specify valid bucket and key for S3 Database')
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
    return s3.putObject({ ...this.options, Body: JSON.stringify(json, null, 2) }).promise()
  }
}
