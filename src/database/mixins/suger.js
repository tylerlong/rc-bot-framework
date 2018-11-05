const suger = {
  async getBot (id) {
    return this.getItem('bots', id)
  },
  async getUser (id) {
    return this.getItem('users', id)
  },
  async putBot (json) {
    await this.putItem('bots', json)
  },
  async putUser (json) {
    await this.putItem('users', json)
  },
  async deleteBot (id) {
    await this.deleteItem('bots', id)
  },
  async deleteUser (id) {
    await this.deleteItem('users', id)
  }
}

export default suger
