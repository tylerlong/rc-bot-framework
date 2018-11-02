import SubX from 'subx'
import RingCentral from 'ringcentral-js-concise'

// import store from './index'
import database from '../database'

const User = new SubX({
  groups: {},
  get rc () {
    const rc = new RingCentral(
      process.env.RINGCENTRAL_USER_CLIENT_ID,
      process.env.RINGCENTRAL_USER_CLIENT_SECRET,
      process.env.RINGCENTRAL_SERVER
    )
    rc.token(this.token)
    return rc
  },
  authorizeUri (groupId, botId) {
    return this.rc.authorizeUri(process.env.RINGCENTRAL_BOT_SERVER + '/user-oauth', {
      state: groupId + ':' + botId,
      responseType: 'code'
    })
  },
  async authorize (code) {
    try {
      await this.rc.authorize({ code, redirectUri: process.env.RINGCENTRAL_BOT_SERVER + '/user-oauth' })
    } catch (e) {
      console.log('User authorize', e.response.data)
      throw e
    }
    this.token = this.rc.token()
    this.id = this.token.owner_id
    this.put()
  },
  async validate () {
    try {
      await this.rc.get('/restapi/v1.0/account/~/extension/~')
      return true
    } catch (e) {
      console.log('User validate', e.response.data)
      console.log('Going to refresh user token')
      try {
        await this.rc.refresh()
        this.token = this.rc.token()
        this.put()
        console.log('User token refreshed')
        return true
      } catch (e) {
        console.log('User validate refresh', e.response.data)
        // delete store.users[this.token.owner_id]
        this.delete()
        console.log(`User ${this.token.owner_id} refresh token has expired`)
        return false
      }
    }
  },
  async clearWebHooks () {
    try {
      const r = await this.rc.get('/restapi/v1.0/subscription')
      for (const sub of r.data.records) {
        if (sub.deliveryMode.address === process.env.RINGCENTRAL_BOT_SERVER + '/user-webhook') {
          await this.rc.delete(`/restapi/v1.0/subscription/${sub.id}`)
        }
      }
    } catch (e) {
      console.log('Bot clearWebHooks', e.response.data)
      throw e
    }
  },
  async setupWebHook () { // setup WebHook for user
    try {
      await this.rc.post('/restapi/v1.0/subscription', {
        eventFilters: [
          '/restapi/v1.0/account/~/extension/~/message-store'
        ],
        deliveryMode: {
          transportType: 'WebHook',
          address: process.env.RINGCENTRAL_BOT_SERVER + '/user-webhook'
        }
      })
    } catch (e) {
      console.log('User setupWebHook', e.response.data)
      throw e
    }
  },
  async addGroup (groupId, botId) {
    const hasNoGroup = Object.keys(this.groups).length === 0
    this.groups[groupId] = botId
    if (hasNoGroup) {
      await this.setupWebHook()
    }
    this.put()
  },
  async getMessages (count) {
    const r = await this.rc.get('/restapi/v1.0/account/~/extension/~/message-store', {
      params: {
        perPage: count
      }
    })
    return r.data.records
  },
  async put () {
    database.putBot(this)
  },
  async delete () {
    database.deleteBot(this.id)
  }
})

User.get = async id => {
  return database.getUser(id)
}

export default User
