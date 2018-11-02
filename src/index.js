import express from 'express'
import bodyParser from 'body-parser'

import bot from './handlers/bot'
import user from './handlers/user'

import Store from './models/Store'
import database from './database'

const store = new Store()
;(async () => {
  const json = await database.read()
  await store.init(json)
})()

const app = express()
app.use(bodyParser.json())

bot.handle(app)
user.handle(app)

app.listen(3000)
