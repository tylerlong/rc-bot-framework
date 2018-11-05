import AWS from 'aws-sdk'

import suger from './mixins/suger'

AWS.config.update({ region: process.env.AWS_REGION })
const dynamoDB = new AWS.DynamoDB()
const docClient = new AWS.DynamoDB.DocumentClient()

class DynamoDB {
  constructor (options) {
    if (!options.tableNamePrefix) {
      throw new TypeError(`Please specify \`tableNamePrefix\` like this: \`new DynamoDB({ tableNamePrefix: '...' })\``)
    }
    this.tableNamePrefix = options.tableNamePrefix
  }

  async ensureTable (name) {
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
          ],
          ProvisionedThroughput: {
            ReadCapacityUnits: 10,
            WriteCapacityUnits: 10
          }
        }).promise()
      } else {
        throw e
      }
    }
  }
  async ensure () {
    await this.ensureTable('bots')
    await this.ensureTable('users')
  }

  async getItem (name, id) {
    const TableName = this.tableNamePrefix + name
    try {
      const r = await docClient.get({
        TableName,
        Key: { id: id.toString() }
      }).promise()
      return r.Item
    } catch (e) {
      console.log('DynomaDB getItem', name, id, e)
      throw e
    }
  }

  async putItem (name, obj) {
    const json = obj.toJSON()
    const TableName = this.tableNamePrefix + name
    try {
      await docClient.put({
        TableName,
        Item: json
      }).promise()
    } catch (e) {
      console.log('DynomaDB putItem', name, e)
      throw e
    }
  }

  async deleteItem (name, id) {
    const TableName = this.tableNamePrefix + name
    try {
      await docClient.delete({
        TableName,
        Key: { id: id.toString() }
      }).promise()
    } catch (e) {
      console.log('DynomaDB deleteItem', name, id, e)
      throw e
    }
  }

  async read () {
    const bots = await docClient.scan({ TableName: this.tableNamePrefix + 'bots' }).promise()
    const users = await docClient.scan({ TableName: this.tableNamePrefix + 'users' }).promise()
    const result = { bots: {}, users: {} }
    bots.Items.forEach(bot => { result.bots[bot.id] = bot })
    users.Items.forEach(user => { result.users[user.id] = user })
    return result
  }
}

Object.assign(DynamoDB.prototype, suger)

export default DynamoDB
