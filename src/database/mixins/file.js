const file = {
  async getItem (table, id) {
    const db = await this.read()
    if (db[table] && db[table][id]) {
      return { ...db[table][id], id }
    }
  },
  async putItem (table, json) {
    const db = await this.read()
    if (!db[table]) {
      db[table] = {}
    }
    db[table][json.id] = json
    await this.write(db)
  },
  async deleteItem (table, id) {
    const db = await this.read()
    delete db[table][id]
    await this.write(db)
  }
}

export default file
