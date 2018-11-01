import store from '../models'
import Bot from '../models/Bot'
import User from '../models/User'

const handle = app => {
  // add bot to Glip
  app.get('/bot-oauth', async (req, res) => {
    const bot = new Bot()
    await bot.authorize(req.query.code)
    store.addBot(bot)
    await bot.setupWebHook()
    res.send('Bot added')
  })

  // bot receive message from Glip
  app.post('/bot-webhook', async (req, res) => {
    const message = req.body
    console.log('Message received via bot WebHook:', JSON.stringify(message, null, 2))
    const botId = message.ownerId
    const body = message.body
    if (body) {
      switch (body.eventType) {
        case 'GroupJoined':
          if (body.type === 'PrivateChat') {
            const bot = store.getBot(botId)
            await bot.sendMessage(body.id, { text: `Hello, I am a chatbot.
Please reply "![:Person](${botId})" if you want to talk to me.` })
          }
          break
        case 'PostAdded':
          if (body.creatorId === botId || body.text.indexOf(`![:Person](${botId})`) === -1) {
            break
          }
          const bot = store.getBot(botId)
          if (/\bmonitor\b/i.test(body.text)) { // monitor messages
            const user = store.getUser(body.creatorId)
            if (user) {
              await user.addGroup(body.groupId, botId)
              await bot.sendMessage(body.groupId, { text: `![:Person](${body.creatorId}), your messages are monitored!` })
            } else {
              const user = new User()
              const authorizeUri = user.authorizeUri(body.groupId, botId)
              await bot.sendMessage(body.groupId, {
                text: `![:Person](${body.creatorId}), [click here](${authorizeUri}) to authorize me to access your RingCentral data first.`
              })
            }
          } else {
            await bot.sendMessage(body.groupId, {
              text: `If you want me to monitor your messages, please reply "![:Person](${botId}) monitor"`
            })
          }
          break
        default:
          break
      }
    }
    res.header('validation-token', req.header('validation-token'))
    res.send('/bot-webhook replied')
  })
}

const bot = { handle }

export default bot
