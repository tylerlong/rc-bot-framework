import SubX from 'subx'
import RingCentral from 'ringcentral-js-concise'

import database from '../database'

const Bot = new SubX({
  get rc () {
    const rc = new RingCentral(
      process.env.RINGCENTRAL_BOT_CLIENT_ID,
      process.env.RINGCENTRAL_BOT_CLIENT_SECRET,
      process.env.RINGCENTRAL_SERVER
    )
    rc.token(this.token)
    return rc
  },
  async authorize (code) {
    try {
      await this.rc.authorize({ code, redirectUri: process.env.RINGCENTRAL_BOT_SERVER + '/bot-oauth' })
    } catch (e) {
      console.log('Bot authorize', e.response.data)
      throw e
    }
    this.token = this.rc.token()
    this.id = this.token.owner_id
    this.put()
  },
  async setupWebHook () {
    try {
      await this.rc.post('/restapi/v1.0/subscription', {
        eventFilters: [
          '/restapi/v1.0/glip/posts',
          '/restapi/v1.0/glip/groups'
        ],
        expiresIn: 473040000, // 15 years
        deliveryMode: {
          transportType: 'WebHook',
          address: process.env.RINGCENTRAL_BOT_SERVER + '/bot-webhook'
        }
      })
    } catch (e) {
      console.log('Bot setupWebHook', e.response.data)
      throw e
    }
  },
  async clearWebHooks () {
    try {
      const r = await this.rc.get('/restapi/v1.0/subscription')
      for (const sub of r.data.records) {
        await this.rc.delete(`/restapi/v1.0/subscription/${sub.id}`)
      }
    } catch (e) {
      console.log('Bot clearWebHooks', e.response.data)
      throw e
    }
  },
  async sendMessage (groupId, messageObj) {
    try {
      await this.rc.post(`/restapi/v1.0/glip/groups/${groupId}/posts`, messageObj)
    } catch (e) {
      console.log('Bot sendMessage', e.response.data)
      throw e
    }
  },
  async validate () {
    try {
      await this.rc.get('/restapi/v1.0/account/~/extension/~')
      return true
    } catch (e) {
      console.log('Bot validate', e.response.data)
      const errorCode = e.response.data.errorCode
      if (errorCode === 'OAU-232' || errorCode === 'CMN-405') {
        await this.delete()
        console.log(`Bot user ${this.token.owner_id} has been deleted`)
        return false
      }
      throw e
    }
  },
  async put () {
    await database.putBot(this)
  },
  async delete () {
    await database.deleteBot(this.id)
  }
})

Bot.get = async id => {
  const json = await database.getBot(id)
  if (json) {
    return new Bot(json)
  }
}

export default Bot
