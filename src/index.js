import dotenv from 'dotenv'
import express from 'express'
import bodyParser from 'body-parser'
import store, { Bot, User } from './store'

dotenv.config()

const app = express()
app.use(bodyParser.json())

// add bot to Glip
app.get('/bot-oauth', async (req, res) => {
  const bot = new Bot()
  await bot.authorize(req.query.code)
  store.addBot(bot)
  await bot.setupWebHook()
  res.send('Bot added')
})

// user authorize bot
app.get('/user-oauth', async (req, res) => {
  const user = new User()
  await user.authorize(req.query.code)
  store.addUser(user)

  // todo: setup user voicemail webhook

  const [groupId, botId] = req.query.state.split(':')
  const bot = store.getBot(botId)
  await bot.sendMessage(groupId, { text: 'You have successfully authorized me to access your RingCentral data!' })
  res.send('You have authorized the bot to access your RingCentral data! Please close this page and get back to Glip.')
})

// bot receive message from Glip
app.post('/bot-webhook', async (req, res) => {
  const message = req.body
  console.log('Message received via bot WebHook:', message)
  const botId = message.ownerId
  const body = message.body
  if (body) {
    switch (body.eventType) {
      case 'GroupJoined':
        if (body.type === 'PrivateChat') {
          const bot = store.getBot(botId)
          await bot.sendMessage(body.id, { text: `Hello, you just started a new conversation with the bot!` })
        }
        break
      case 'PostAdded':
        if (body.creatorId !== botId) { // Bot should not respond to himself
          const bot = store.getBot(botId)
          const user = store.getUser(body.creatorId)
          if (user) {
            bot.sendMessage(body.groupId, { text: 'Got it!' })
          } else {
            const user = new User()
            const authorizeUri = user.authorizeUri(body.groupId, botId)
            await bot.sendMessage(body.groupId, {
              text: `Please [click here](${authorizeUri}) to authorize me to access your RingCentral data.`
            })
          }
        }
        break
      default:
        break
    }
  }
  res.header('validation-token', req.header('validation-token'))
  res.send('WebHook replied')
})

app.listen(3000)
