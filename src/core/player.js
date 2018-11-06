const Main = require('../main')
const Logger = require('../util/logger')
const fs = require('fs')
const { getTime } = require('../util/timeFormat')

var players = {}
var guildLog = {}


class Player {

    constructor(vc) {
        return new Promise((resolve, reject) => {

            this.guild = vc.guild
            this.vc = vc
            this.disabled = false
            vc.join()
                .then(con => {
                    this.con = con
                    players[this.guild.id] = this
                    Logger.debug('Created player on guild ' + this.guild.name)
                    resolve(this)
                })
                .catch(err => { 
                    reject(new Error('Failed connecting to voice channel.\n' + err))
                })

        })
    }

    static getFilelist(sorted) {

        function _filter(a, b) {
            let _a = Date.parse(fs.statSync(`${loc}/${a}`).mtime)
            let _b = Date.parse(fs.statSync(`${loc}/${b}`).mtime)
            return _b - _a
        }

        let loc = Main.config.fileloc
        let files = fs.readdirSync(loc)
            .filter(f => Main.config.files.indexOf(f.split('.')[1].toLowerCase()) > -1)
        if (sorted)
            files.sort(_filter)
        return files
    }

    _volume() {
        return Main.settings.guild(this.guild).volume ? Main.settings.guild(this.guild).volume : 1
    }

    play(soundfile, memb) {
        // DEBUG
        var STARTTIME = Date.now()
        function getDelay() { return Date.now() - STARTTIME }
        
        return new Promise((resolve, reject) => {
            // DEBUG
            Logger.debug(`[PLAYER] [${getDelay()}] Created Promise`)

            if (this.disabled) {
                reject('Soundboard currently disabled by owner.')
                return
            }
            let file = soundfile.split('.')[1] ? 
                       soundfile : 
                       Player.getFilelist().find(f => f.split('.')[0] == soundfile.toLowerCase())
                       
            if (!fs.existsSync(`${Main.config.fileloc}/${file}`)) {
                Logger.debug(`[PLAYER] [${getDelay()}] File not found`)
                reject('File not found')
                return
            }
            // DEBUG
            Logger.debug(`[PLAYER] [${getDelay()}] Found file, starting playing file`)

            if (file) {
                this.dispatcher = this.con.playFile(`${Main.config.fileloc}/${file}`)
                this.dispatcher.setVolume(this._volume())
                // DEBUG
                Logger.debug(`[PLAYER] [${getDelay()}] File played`)
                
                Logger.debug(`[PLAYED] '${file}' on guild ${this.guild.name}`)

                let logline = `\`${getTime()}\` - **${file.split('.')[0]}** - *(${memb.user.tag})*`
                if (!guildLog[this.guild.id])
                    guildLog[this.guild.id] = [ logline ]
                else {
                    guildLog[this.guild.id].unshift(logline)
                    guildLog[this.guild.id] = guildLog[this.guild.id].slice(0, 20)
                }

                if (Main.config.writestats) {
                    if (soundfile.indexOf('.') > -1)
                        soundfile = soundfile.substring(0, soundfile.indexOf('.'))
                    Main.database.run('INSERT OR IGNORE INTO soundstats (name, count) VALUES (?, 0);', [soundfile], (err) => {
                        if (!err) {
                            Main.database.run('UPDATE soundstats SET count = count + 1 WHERE name = ?', soundfile)
                        }
                    })
                }

                resolve(this)
            }
            else {
                reject('File not found')
            }
        })
    }

    stop() {
        this.con.dispatcher.end()
    }

    random(memb) {
        let files = Player.getFilelist()
        let file = files[Math.floor(Math.random() * files.length)]
        return this.play(file, memb)
    }

    setVolume(vol) {
        this.volume = vol
    }

    switchDisable() {
        this.disabled = !this.disabled
        Logger.debug('Soundboard disabled: ' + this.disabled)
        return this.disabled
    }

    destroy() {
        this.vc.leave()
        players[this.guild.id] = null
        delete this
    }

}


module.exports = {
    players,
    guildLog,
    Player
}