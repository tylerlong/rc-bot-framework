const dotenv = require('dotenv')
dotenv.config()

const express = require('express')
const app = express()

const RingCentral = require('ringcentral-js-concise').default
const rc = new RingCentral(process.env.RINGCENTRAL_CLIENT_ID, process.env.RINGCENTRAL_CLIENT_SECRET, process.env.RINGCENTRAL_SERVER)

app.get('/botoauth', async (req, res) => {
  console.log(req.query.code)
  const code = req.query.code
  try {
    await rc.authorize({ code, redirectUri: process.env.RINGCENTRAL_REDIRECT_URI })
  } catch (e) {
    console.log(JSON.stringify(e.response.data, null, 2))
  }
  console.log(rc.token())
  res.status(400)
  res.send('hello world')
})

app.listen(3000)
