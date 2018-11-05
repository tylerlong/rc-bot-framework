import SubX from 'subx'

import Bot from './Bot'
import User from './User'

// Store
const Store = new SubX({
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
          // store.bots[k] = bot
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
          // store.users[k] = user
          await user.clearWebHooks()
          if (Object.keys(user.groups).length > 0) {
            await user.setupWebHook()
          }
        }
      }
    }
  }
})

export default Store
