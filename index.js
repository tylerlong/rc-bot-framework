const fs = require('fs')

const dotenv = require('dotenv')
dotenv.config()

const express = require('express')
const app = express()

// Use SubX to auto save tokens
const SubX = require('subx')
const store = SubX.create({
  botTokens: []
})
const botTokens = require('./bot-tokens.json')
store.botTokens = botTokens
SubX.autoRun(store, () => {
  fs.writeFileSync('./bot-tokens.json', JSON.stringify(store.botTokens, null, 2))
})

const RingCentral = require('ringcentral-js-concise').default
const rc = new RingCentral(process.env.RINGCENTRAL_CLIENT_ID, process.env.RINGCENTRAL_CLIENT_SECRET, process.env.RINGCENTRAL_SERVER)

app.get('/botoauth', async (req, res) => {
  const code = req.query.code
  try {
    await rc.authorize({ code, redirectUri: process.env.RINGCENTRAL_REDIRECT_URI })
  } catch (e) {
    console.log(JSON.stringify(e.response.data, null, 2))
  }
  console.log(rc.token())
  store.botTokens.push(rc.token())
  res.status(400)
  res.send('hello world')
})

app.post('/glip-webhook', (req, res) => {

})

app.listen(3000)
