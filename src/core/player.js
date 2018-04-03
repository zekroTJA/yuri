const { config, client } = require('../main')
const Logger = require('../util/logger')
const fs = require('fs')


var players = {}


class Player {

    constructor(vc) {
        return new Promise((resolve, reject) => {

            this.guild = vc.guild
            this.vc = vc
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
            files.sort(_filter).forEach(f => console.log(f,'\t' , Date.parse(fs.statSync(`${loc}/${f}`).mtime)))
        return files
    }

    play(soundfile) {
        return new Promise((resolve, reject) => {
            let file = soundfile.split('.')[1] ? 
                       soundfile : 
                       Player.getFilelist().find(f => f.startsWith(soundfile.toLowerCase()))
            if (file) {
                this.con.playFile(`${config.fileloc}/${file}`)
                Logger.debug(`[PLAYED] '${file}' on guild ${this.guild.name}`)
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

}


module.exports = {
    players,
    Player
}