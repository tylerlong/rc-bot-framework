import store, { User } from './store'

const handle = app => {
  // user authorize bot
  app.get('/user-oauth', async (req, res) => {
    const user = new User()
    await user.authorize(req.query.code)
    store.addUser(user)
    const [groupId, botId] = req.query.state.split(':')
    const bot = store.getBot(botId)
    await bot.sendMessage(groupId, { text: `![:Person](${user.token.owner_id}), You have successfully authorized me to access your RingCentral data!
Please reply "![:Person](${botId}) monitor" if you want me to monitor your voicemail.` })
    res.send('You have authorized the bot to access your RingCentral data! Please close this page and get back to Glip.')
  })

  // user receive message from Platform
  app.post('/user-webhook', async (req, res) => {
    const message = req.body
    console.log('Message received via user WebHook:', JSON.stringify(message, null, 2))
    if (message.body) {
      const change = message.body.changes.filter(change => change.type === 'VoiceMail' && change.newCount && change.newCount > 0)[0]
      if (change) {
        const userId = message.body.extensionId
        const user = store.getUser(userId)
        const voiceMails = await user.getVoiceMails(change.newCount)
        console.log(JSON.stringify(voiceMails, null, 2))

        // todo: process VoiceMails

        for (const groupId of Object.keys(user.groups)) {
          const botId = user.groups[groupId]
          const bot = store.getBot(botId)
          await bot.sendMessage(groupId, { text: `![:Person](${userId}), you got a new voiceMail!` })
        }
      }
    }
    res.header('validation-token', req.header('validation-token'))
    res.send('/user-webhook replied')
  })
}

const user = { handle }

export default user
