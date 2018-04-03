const Discord = require('discord.js')
const colors = require('colors')
const fs = require('fs')
const Logger = require('./util/logger')

// Creating discord client instance
var client = new Discord.Client()

// Load or generate config
if (fs.existsSync('config.json')) {
    var config = require('../config.json')
    Logger.info('Config loaded')
}
else {
    var def_conf = {
        token: "",
        prefix: ".",
        files: ["mp3", "mp4", "wav", "ogg"],
        fileloc: "./sounds",
        owner: "",
        writestats: true
    }
    fs.writeFileSync('config.json', JSON.stringify(def_conf, 0, 2))
    Logger.error('Config file created. Please enter your information into this file and restart the bot after.')
    process.exit()
}

// Exporting client and config for other modules
module.exports = {
    client,
    config
}

// Registering events
require('./core/readyEvent')
require('./core/messageEvent')


Logger.debug('Debug mode enabled')

// Logging into this shit
client.login(config.token)
    .catch(err => Logger.error('Failed logging in:\n' + err))