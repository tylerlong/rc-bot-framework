// import store from '../models'
import Bot from '../models/Bot'
import User from '../models/User'

const handle = app => {
  // user authorize bot
  app.get('/user-oauth', async (req, res) => {
    const user = new User()
    await user.authorize(req.query.code)

    // store.addUser(user)
    // user.put()

    const [groupId, botId] = req.query.state.split(':')

    // const bot = store.getBot(botId)
    const bot = Bot.get(botId)

    await bot.sendMessage(groupId, { text: `![:Person](${user.token.owner_id}), you have successfully authorized me to access your RingCentral data!` })
    await user.addGroup(groupId, botId)
    await bot.sendMessage(groupId, { text: `![:Person](${user.token.owner_id}), your messages are monitored!` })
    res.send('You have authorized the bot to access your RingCentral data! Please close this page and get back to Glip.')
  })

  // user receive message from Platform
  app.post('/user-webhook', async (req, res) => {
    const message = req.body
    console.log('Message received via user WebHook:', JSON.stringify(message, null, 2))
    if (message.body) {
      const change = message.body.changes.filter(change => change.newCount && change.newCount > 0)[0]
      if (change) {
        const userId = message.body.extensionId

        // const user = store.getUser(userId)
        const user = User.get(userId)

        for (const groupId of Object.keys(user.groups)) {
          const botId = user.groups[groupId]

          // const bot = store.getBot(botId)
          const bot = Bot.get(botId)

          await bot.sendMessage(groupId, { text: `![:Person](${userId}), you got new message!` })
        }
      }
    }
    res.header('validation-token', req.header('validation-token'))
    res.send('/user-webhook replied')
  })
}

const user = { handle }

export default user
