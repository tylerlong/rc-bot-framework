class Database {
  constructor (options) {
    if (new.target === Database) {
      throw new TypeError('"Cannot construct Abstract instances directly')
    }
    for (const key of Object.keys(options)) {
      this[key] = options[key]
    }
  }
}

export default Database
