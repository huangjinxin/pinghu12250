const EventEmitter = require('events')

class AchievementEmitter extends EventEmitter {}
const achievementEmitter = new AchievementEmitter()

achievementEmitter.setMaxListeners(50)

module.exports = achievementEmitter
