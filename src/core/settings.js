const fs = require('fs')
const Logger = require('../util/logger')


const FILE_NAME = 'SETTINGS.json'

class Settings {

    constructor() {
        this.settings = {
            guilds: {},
            users: {}
        }
        this.load()
    }

    load() {
        if (fs.existsSync(FILE_NAME)) {
            try {
                this.settings = JSON.parse(fs.readFileSync(FILE_NAME, 'utf8'))
                Logger.info('Settings loaded successfully')
            }
            catch (err) {
                Logger.error('Failed loading settings:\n' + err)
            }
        }
        return this
    }

    save() {
        try {
            fs.writeFileSync(FILE_NAME, JSON.stringify(this.settings, 0, 2))
            Logger.info('Saved settings successfully')
        }
        catch (err) {
            Logger.error('Failed saving settings to file')
        }
        return this
    }

    guild(guildid) {
        return this.settings.guils[guildid] ? this.settings.guilds[guildid] : {}
    }

    user(userid) {
        return this.settings.users[userid] ? this.settings.users[userid] : {}
    }

    set_guild(guildid, obj) {
        if (!this.settings.guilds[guildid])
            this.settings.guilds[guildid] = {}
        Object.keys(obj).forEach(k => {
            this.settings.guilds[guildid][k] = obj[k]
        })
        return this
    }

    set_user(userid, obj) {
        if (!this.settings.users[userid])
            this.settings.users[userid] = {}
        Object.keys(obj).forEach(k => {
            this.settings.users[userid][k] = obj[k]
        })
        return this
    }

}


module.exports = {
    Settings
}