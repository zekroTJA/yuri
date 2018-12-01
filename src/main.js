const Discord = require('discord.js')
const colors = require('colors')
const fs = require('fs')
const Sqlite = require('sqlite3')
const EventEmiter = require('events')
const request = require('request')

const Logger = require('./util/logger')
const { CrashCollector } = require('./util/crashCollector')
const { Settings } = require('./core/settings')

if (!fs.existsSync('./expose')){
    fs.mkdirSync('./expose');
}

// Creating discord client instance
var client = new Discord.Client()

var DEBUG_MODE = (() => {
    var ind = process.argv.indexOf("--test")
    return (ind == 2 && process.argv[3])
})()

exports.DEBUG_MODE = DEBUG_MODE

function reloadConfig() {
    if (fs.existsSync('config.json')) {
        var config = require('../config.json')
        Logger.info('Config reloaded')
        return true
    }
    return false
}

// Load or generate config
const DEF_CONF = {
    token: "bot Token",
    client: {
        id: "id of the CLIENT (in 'General Information')",
        secret: "secret of the CLIENT (also in 'General Information')"
    },
    lavalink: {
        host: 'localhost',
        port: 2333,
        password: 'please_dont_change_this_section_if_you_are_using_the_docker_image'
    },
    cert: {
        certfile: "/etc/certs/certfile.cer",
        keyfile: "/etc/certs/keyfile.key"
    },
    serveraddr: "address of your server, i.e. http://zekro.de:6612",
    prefix: ".",
    wstoken: "exampletokenactuallythisneedstobemorecomplexandthisisjustfortravis",
    files: ["mp3", "mp4", "wav", "ogg"],
    fileloc: "/usr/src/app/expose/sounds",
    owner: "",
    writestats: true,
    gamerota: ["zekro.de"]
}
if (DEBUG_MODE) {
    var config = DEF_CONF
    Logger.info("Setting default config for testing routine...")
}
else if (fs.existsSync('./expose/config.json')) {
    var config = require('../expose/config.json')
    let missingKeys = []
    Object.keys(DEF_CONF).forEach((key) => {
        if (config[key] == undefined)
            missingKeys.push(key)
    })
    if (missingKeys.length > 0) {
        Logger.error('Some keys are missing in your config:\n' + 
                      missingKeys.map(k => `"${k}"`).join(', ') +
                      '\nPlease rename your config and re-create a fresh one to correct this issue!')
        return
    }
    Logger.info('Config loaded')
}
else {
    fs.writeFileSync('./expose/config.json', JSON.stringify(DEF_CONF, 0, 2))
    Logger.error('Config file created. Please enter your information into this file and restart the bot after.')
    process.exit()
}

if (!fs.existsSync(config.fileloc)) {
    Logger.error('Sound file location does not exist!');
    process.exit();
}

var database = new Sqlite.Database('./expose/DB.sqlite3')
database.run('CREATE TABLE IF NOT EXISTS soundstats (name VARCHAR PRIMARY KEY, count BIGINT);')
database.run('CREATE TABLE IF NOT EXISTS apitokens  (uid VARCHAR PRIMARY KEY, token VARCHAR, createdAt BIGINT);')
database.run('CREATE TABLE IF NOT EXISTS users      (id VARCHAR PRIMARY KEY, createdAt bigint, lastAccess bigint, permcode bigint)')
Logger.info('Database hooked up')

var settings = new Settings(database)

// Exporting client and config for other modules
Object.assign(module.exports, {
    client,
    config,
    reloadConfig,
    settings,
    database
})

// Registering events
require('./core/readyEvent')
require('./core/messageEvent')
require('./core/reactionEvent')
require('./core/voiceEvent')
require('./util/gameRotator')

Logger.debug('Debug mode enabled')

var ws = new (require('./core/websocket'))()

client.on('error', (e) => Logger.error(e))

// Logging into this shit
client.login(DEBUG_MODE ? process.argv[3] : config.token)
    .catch(err => Logger.error('Failed logging in:\n' + err))


// EXIT HANDLER
function exitHandler(exit, err) {
    Logger.debug('Shutting down...')

    const { soundStats } = require('./core/player')
    settings.save()
    database.close()

    if (exit)
        process.exit()
}

exports.eventEmiter = new EventEmiter()
new CrashCollector('./expose/crash_logs', (err, exit) => {
    exports.eventEmiter.emit('closing')
})

process.on('exit', exitHandler)
process.on('SIGINT', exitHandler.bind(null, true))