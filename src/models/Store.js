import SubX from 'subx'

import Bot from './Bot'
import User from './User'
import store from './index'

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

export default Store
