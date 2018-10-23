const fs = require('fs')
const R = require('ramda')

const dotenv = require('dotenv')
dotenv.config()

const express = require('express')
const app = express()

const bodyParser = require('body-parser')
app.use(bodyParser.json())

// Use SubX to auto save tokens
const SubX = require('subx')
const store = SubX.create({
  botTokens: {}
})
const botTokens = require('./bot-tokens.json')
store.botTokens = botTokens
SubX.autoRun(store, () => {
  fs.writeFileSync('./bot-tokens.json', JSON.stringify(store.botTokens, null, 2))
})

const RingCentral = require('ringcentral-js-concise').default
const rc = new RingCentral(process.env.RINGCENTRAL_CLIENT_ID, process.env.RINGCENTRAL_CLIENT_SECRET, process.env.RINGCENTRAL_SERVER)

// remove existing bot WebHooks
const clearBotWebHooks = async token => {
  const rc = new RingCentral('', '', process.env.RINGCENTRAL_SERVER)
  rc.token(token)
  const r = await rc.get('/restapi/v1.0/subscription')
  r.data.records.forEach(async sub => {
    await rc.delete(`/restapi/v1.0/subscription/${sub.id}`)
  })
}
R.values(store.botTokens).forEach(async token => {
  await clearBotWebHooks(token)
})

const setupBotWebHook = async token => {
  try {
    const rc = new RingCentral('', '', process.env.RINGCENTRAL_SERVER)
    rc.token(token)
    const res = await rc.post('/restapi/v1.0/subscription', {
      eventFilters: [
        '/restapi/v1.0/glip/posts',
        '/restapi/v1.0/glip/groups'
      ],
      deliveryMode: {
        transportType: 'WebHook',
        address: process.env.RINGCENTRAL_BOT_SERVER + '/bot-webhook'
      }
    })
    console.log(res.data)
  } catch (e) {
    const data = e.response.data
    if (data.errorCode === 'OAU-232') { // Extension not found
      delete store.botTokens[token.owner_id]
      console.log(`Bot user ${token.owner_id} has been deleted`)
    }
  }
}
R.values(store.botTokens).forEach(async token => {
  await setupBotWebHook(token)
})

// add bot to Glip
app.get('/bot-oauth', async (req, res) => {
  const code = req.query.code
  try {
    await rc.authorize({ code, redirectUri: process.env.RINGCENTRAL_BOT_SERVER + '/bot-oauth' })
  } catch (e) {
    console.log(JSON.stringify(e.response.data, null, 2))
  }
  const token = rc.token()
  console.log(token)
  store.botTokens[token.owner_id] = token

  await setupBotWebHook(token)

  // res.status(400)
  res.send('Bot added!')
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
          const token = store.botTokens[botId]
          const rc = new RingCentral('', '', process.env.RINGCENTRAL_SERVER)
          rc.token(token)
          await rc.post('/restapi/v1.0/glip/posts', {
            text: 'Hello, you just started a new conversation with the bot!'
          })
        }
        break
      case 'PostAdded':
        if (body.creatorId !== botId) { // Bot should not respond to himself
          const token = store.botTokens[botId]
          const rc = new RingCentral('', '', process.env.RINGCENTRAL_SERVER)
          rc.token(token)
          await rc.post(`/restapi/v1.0/glip/groups/${body.groupId}/posts`, {
            text: 'Got it!'
          })
        }
        break
      default:
        break
    }
  }
  res.header('validation-token', req.header('validation-token'))
  res.send('hello from webhook')
})

app.listen(3000)
