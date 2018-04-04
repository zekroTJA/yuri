const { config, client } = require('../main')
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
            this.volume = 1
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

        let loc = config.fileloc
        let files = fs.readdirSync(loc)
            .filter(f => config.files.indexOf(f.split('.')[1].toLowerCase()) > -1)
        if (sorted)
            files.sort(_filter)
        return files
    }

    play(soundfile) {
        return new Promise((resolve, reject) => {
            if (this.disabled) {
                reject('Soundboard currently disabled by owner.')
                return
            }
            let file = soundfile.split('.')[1] ? 
                       soundfile : 
                       Player.getFilelist().find(f => f.startsWith(soundfile.toLowerCase()))
            if (file) {
                this.con.playFile(`${config.fileloc}/${file}`).setVolume(this.volume)
                Logger.debug(`[PLAYED] '${file}' on guild ${this.guild.name}`)

                let logline = `\`${getTime()}\` - **${file.split('.')[0]}** - *(${this.vc.name})*`
                if (!guildLog[this.guild.id])
                    guildLog[this.guild.id] = [ logline ]
                else {
                    guildLog[this.guild.id].unshift(logline)
                    guildLog[this.guild.id] = guildLog[this.guild.id].slice(0, 20)
                }
                resolve(this)
            }
            else {
                reject('File not found')
            }
        })
    }

    stop() {
        this.dispatcher.end()
    }

    random() {
        let files = Player.getFilelist()
        let file = files[Math.floor(Math.random() * files.length)]
        return this.play(file)
    }

    setVolume(vol) {
        this.volume = vol
    }

    switchDisable() {
        this.disabled = !this.disabled
        Logger.debug('Soundboard disabled: ' + this.disabled)
        return this.disabled
    }

}


module.exports = {
    players,
    guildLog,
    Player
}