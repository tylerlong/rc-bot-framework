import dotenv from 'dotenv'
import express from 'express'
import bodyParser from 'body-parser'

import bot from './bot'
import user from './user'

dotenv.config()

const app = express()
app.use(bodyParser.json())

bot.handle(app)
user.handle(app)

app.listen(3000)
