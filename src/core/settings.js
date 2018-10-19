const fs = require('fs')
const Logger = require('../util/logger')


const FILE_NAME = 'SETTINGS.json'

class Settings {

    constructor(database) {
        this.db = database
        this.db.run('CREATE TABLE IF NOT EXISTS settings_guilds (id VARCHAR PRIMARY KEY, data VARCHAR);')
        this.db.run('CREATE TABLE IF NOT EXISTS settings_users (id VARCHAR PRIMARY KEY, data VARCHAR);')

        this.settings = {
            guilds: {},
            users: {}
        }

        this.load()
    }

    load() {
        this.db.each('SELECT * FROM settings_guilds;', (err, row) => {
            if (err) {
                Logger.error('Failed loading from database: ' + err)
                return this
            }
            try {
                let data = JSON.parse(row.data)
                this.settings.guilds[row.id] = data
            } catch (e) {
                Logger.error(`Could not parse data for guild "${row.id}": ${e}`)
            }
        })
        this.db.each('SELECT * FROM settings_users;', (err, row) => {
            if (err) {
                Logger.error('Failed loading from database: ' + err)
                return this
            }
            try {
                let data = JSON.parse(row.data)
                this.settings.users[row.id] = data
            } catch (e) {
                Logger.error(`Could not parse data for user "${row.id}": ${e}`)
            }
        })
        return this
    }

    save() {

        Object.keys(this.settings.guilds).forEach((id) => {
            let sdata = JSON.stringify(this.settings.guilds[id])
            this.db.run('INSERT OR IGNORE INTO settings_guilds (id, data) VALUES (?, ?);', id, sdata)
            this.db.run('UPDATE settings_guilds SET data = ? WHERE id = ?;', sdata, id)
        })

        Object.keys(this.settings.users).forEach((id) => {
            let sdata = JSON.stringify(this.settings.users[id])
            this.db.run('INSERT OR IGNORE INTO settings_users (id, data) VALUES (?, ?);', id, sdata)
            this.db.run('UPDATE settings_users SET data = ? WHERE id = ?;', sdata, id)
        })
        
        return this
    }

    guild(guildid) {
        if (guildid.id)
            guildid = guildid.id
        return this.settings.guilds[guildid] ? this.settings.guilds[guildid] : {}
    }

    user(userid) {
        if (userid.id)
            userid = userid.id
        return this.settings.users[userid] ? this.settings.users[userid] : {}
    }

    set_guild(guildid, obj) {
        if (guildid.id)
            guildid = guildid.id
        if (!this.settings.guilds[guildid])
            this.settings.guilds[guildid] = {}
        Object.keys(obj).forEach(k => {
            this.settings.guilds[guildid][k] = obj[k]
        })
        return this
    }

    set_user(userid, obj) {
        if (userid.id)
            userid = userid.id
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