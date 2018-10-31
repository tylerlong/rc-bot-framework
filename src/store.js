import dotenv from 'dotenv'
import SubX from 'subx'
import RingCentral from 'ringcentral-js-concise'
import { debounceTime } from 'rxjs/operators'
import path from 'path'

import { FileDatabase, S3Database } from './database'

dotenv.config()

// Store
const Store = new SubX({
  bots: {},
  users: {},
  async init (json) {
    for (const key of Object.keys(json)) {
      if (key !== 'bots' && key !== 'users') {
        this[key] = json[key]
      }
    }
    // init bots
    if (json.bots) {
      for (const k of Object.keys(json.bots)) {
        const bot = new Bot(json.bots[k])
        if (await bot.validate()) {
          store.bots[k] = bot
          await bot.clearWebHooks()
          await bot.setupWebHook()
        }
      }
    }
    // init users
    if (json.users) {
      for (const k of Object.keys(json.users)) {
        const user = new User(json.users[k])
        if (await user.validate()) {
          store.users[k] = user
          await user.clearWebHooks()
          if (Object.keys(user.groups).length > 0) {
            await user.setupWebHook()
          }
        }
      }
    }
  },
  getBot (id) {
    return this.bots[id]
  },
  getUser (id) {
    return this.users[id]
  },
  addBot (bot) {
    this.bots[bot.token.owner_id] = bot
  },
  addUser (user) {
    this.users[user.token.owner_id] = user
  }
})

// Bot
export const Bot = new SubX({
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
  },
  async setupWebHook () {
    try {
      await this.rc.post('/restapi/v1.0/subscription', {
        eventFilters: [
          '/restapi/v1.0/glip/posts',
          '/restapi/v1.0/glip/groups'
        ],
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
        delete store.bots[this.token.owner_id]
        console.log(`Bot user ${this.token.owner_id} has been deleted`)
        return false
      }
      throw e
    }
  }
})

// User
export const User = new SubX({
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
        console.log('User token refreshed')
        return true
      } catch (e) {
        console.log('User validate refresh', e.response.data)
        delete store.users[this.token.owner_id]
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
  },
  async getMessages (count) {
    const r = await this.rc.get('/restapi/v1.0/account/~/extension/~/message-store', {
      params: {
        perPage: count
      }
    })
    return r.data.records
  }
})

let database
if (process.env.AWS_S3_BUCKET) {
  database = new S3Database({
    bucket: process.env.RINGCENTRAL_BOT_DATABASE_S3_BUCKET,
    key: process.env.RINGCENTRAL_BOT_DATABASE_S3_KEY
  })
} else {
  database = new FileDatabase({ file: path.join('..', process.env.RINGCENTRAL_BOT_DATABASE_FILE) })
}

const store = new Store()

;(async () => {
  const json = await database.read()
  await store.init(json)
  SubX.autoRun(store, () => database.write(store), debounceTime(1000))
})()

export default store
