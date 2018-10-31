import dotenv from 'dotenv'
import express from 'express'
import bodyParser from 'body-parser'

import bot from './handlers/bot'
import user from './handlers/user'

dotenv.config()

const app = express()
app.use(bodyParser.json())

bot.handle(app)
user.handle(app)

app.listen(3000)
