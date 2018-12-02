const Main = require('../main')
const Logger = require('../util/logger')
const fs = require('fs')
const path = require('path')
const { getTime } = require('../util/timeFormat')
const { PlayerManager } = require("discord.js-lavalink");
const request = require('request');

var players = {}
var guildLog = {}

console.log('PLAYER FILE LOADED')

const MAIN_NODE = { 
    host:     Main.config.lavalink.host, 
    port:     Main.config.lavalink.port, 
    // region:   Main.client.guilds.first().region, 
    password: Main.config.lavalink.password 
}

const nodes = [ MAIN_NODE ]

function getSound(fileName) {
    return new Promise((resolve, reject) => {
        request({
            uri: `http://${MAIN_NODE.host}:${MAIN_NODE.port}/loadtracks?identifier=${Main.config.fileloc}/${fileName}`,
            headers: {
                'Authorization': MAIN_NODE.password
            }
        }, (err, res, body) => {
            if (err) {
                reject(err);
                return;
            }
            try {
                body = JSON.parse(body);
            } catch (jsonerr) {
                reject(jsonerr)
                return
            }
            if (body && body.tracks && body.tracks.length > 0) {
                resolve(body.tracks[0].track);
            } else (
                reject('file not found')
            )
        }).on('error', (err) => {
            reject(err);
        });
    });
}

class Player {

    constructor(vc) {
        return new Promise((resolve, reject) => {
            this.manager = new PlayerManager(Main.client, nodes, {
                user: Main.client.user.id,
                shards: 1
            });
            this.guild = vc.guild
            this.vc = vc
            this.disabled = false
            this.soundFiles = Player.getFilelist()
            this.player = this.manager.join({
                guild: this.guild.id,
                channel: vc.id,
                host: MAIN_NODE.host,
                region: this.guild.region
            })
            this.player.once("error", error => console.error(error));
            this.player.once("end", data => {
                if (data.reason === "REPLACED") return;
            });
            players[this.guild.id] = this
            Logger.debug('Created player on guild ' + this.guild.name)
            resolve(this)
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
        
        return new Promise((resolve, reject) => {

            if (this.disabled) {
                reject('Soundboard currently disabled by owner.')
                return
            }
            let file = soundfile.split('.')[1] ? 
                       soundfile : 
                       this.soundFiles.find(f => f.split('.')[0] == soundfile.toLowerCase())
                       
            if (!fs.existsSync(`${Main.config.fileloc}/${file}`)) {
                reject('File not found')
                return
            }

            if (file) {
                Logger.debug(`[PLAYED] '${file}' on guild ${this.guild.name}`)

                getSound(file).then((track) => {
                    this.player.play(track);
                    this.player.once("error", error => console.error(error));
                    this.player.once("end", data => {
                        Logger.debug(`[PLAYED] '${file}' on guild ${this.guild.name}`)
                        if (data.reason === "REPLACED") return;
                    });
                    resolve(this)
                }).catch((err) => {
                    Logger.error('Failed playing file: ' + err);
                    reject(err);
                })

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
            }
            else {
                reject('File not found')
            }
        })
    }

    stop() {
        this.player.stop()
    }

    random(memb) {
        let file = this.soundFiles[Math.floor(Math.random() * this.soundFiles.length)]
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

    refetch() {
        let nBefore = this.soundFiles.length
        this.soundFiles = Player.getFilelist()
        return this.soundFiles.length - nBefore
    }

    destroy() {
        this.player.destroy()
        this.manager.leave(this.guild.id)
        players[this.guild.id] = null
    }

}


module.exports = {
    players,
    guildLog,
    Player
}