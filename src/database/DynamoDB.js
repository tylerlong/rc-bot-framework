import AWS from 'aws-sdk'

import suger from './mixins/suger'

AWS.config.update({ region: process.env.AWS_REGION })
const dynamoDB = new AWS.DynamoDB()

class DynamoDB {
  constructor (options) {
    if (!options.tableNamePrefix) {
      throw new TypeError(`Please specify \`tableNamePrefix\` like this: \`new DynamoDB({ tableNamePrefix: '...' })\``)
    }
    this.tableNamePrefix = options.tableNamePrefix
  }

  async ensure (name) {
    const TableName = this.tableNamePrefix + name
    try {
      await dynamoDB.describeTable({ TableName }).promise()
    } catch (e) {
      if (e.code === 'ResourceNotFoundException') {
        await dynamoDB.createTable({
          TableName,
          AttributeDefinitions: [
            { AttributeName: 'id', AttributeType: 'S' }
          ],
          KeySchema: [
            { AttributeName: 'id', KeyType: 'HASH' }
          ]
        }).promise()
      } else {
        throw e
      }
    }
  }

  async getItem (name, id) {
    await this.ensure(name)
    const TableName = this.tableNamePrefix + name
    await dynamoDB.getItem({
      TableName,
      Key: { id: { S: id } }
    }).promise()
  }

  async putItem (name, json) {
    const TableName = this.tableNamePrefix + name
    await dynamoDB.putItem({
      TableName,
      Item: json
    }).promise()
  }

  async deleteItem (name, id) {
    const TableName = this.tableNamePrefix + name
    await dynamoDB.deleteItem({
      TableName,
      Key: { id: { S: id } }
    }).promise()
  }
}

Object.assign(DynamoDB.prototype, suger)

export default DynamoDB
