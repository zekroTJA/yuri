const Main = require('../main')
const Logger = require('../util/logger')
const { players, Player } = require('../core/player')
const { info, error } = require('../util/msgs')

const express = require('express')

// DEVTOKEN: zhyQUaHHdFwyUB7zW8GCB5Jb7AOh38e7AJgSuV4xdsN478lPxHtM2GGNAGqXpPT7

const STATUS = {
    ERROR: "ERROR",
    OK: "OK"
}

const ERRCODE = {
    OK: 0,
    INVALID_TOKEN: 1,
    INVALID_GUILD: 2,
    INVALID_FILE : 3,
    PLAYER_ERROR : 4
}

class Websocket {

    constructor() {
        this.app = express()
        this.token = Main.config.wstoken
        if (!this.token || this.token == "") {
            Logger.error("Can not set up Websocket API! Missing token in config!")
            return
        }

        // PLAY SOUND METHOD
        this.app.get('/', (req, res) => {
            res.set('Content-Type', 'application/json')
            
            var token = req.query.token
            var guildID = req.query.guild
            var soundFile = req.query.file


            if (!this._checkToken(token)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                return
            }

            if (!Object.keys(players).includes(guildID)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_GUILD)
                return
            }

            if (!soundFile || soundFile == "") {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_GUILD)
                return
            }
            
            var player = players[guildID]
            player.play(soundFile).then(() => {
                this._sendStatus(res, STATUS.OK, 0)
            }).catch(e => {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.PLAYER_ERROR, e)
            })
        })

        // GET SOUND FILES
        this.app.get('/sounds', (req, res) => {
            res.set('Content-Type', 'application/json')
            var token = req.query.token

            if (!this._checkToken(token)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                return
            }

            var fileList = Player.getFilelist()
                .map(f => f.split('.')[0])

            res.send(JSON.stringify({
                status: STATUS.OK, 
                code: 0,
                desc: {
                    n: fileList.length,
                    sounds: fileList
                }
            }, 0, 2))
        })

        // SET GUILDS AND IDS
        this.app.get('/guilds', (req, res) => {
            res.set('Content-Type', 'application/json')
            var token = req.query.token

            if (!this._checkToken(token)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                return
            }

            var servers = Main.client.guilds
                .map(g => [g.name, g.id])
            
            res.send(JSON.stringify({
                status: STATUS.OK, 
                code: 0,
                desc: {
                    n: servers.length,
                    servers: servers
                }
            }, 0, 2))
        })

        // CHECK TOKEN
        this.app.get('/token', (req, res) => {
            res.set('Content-Type', 'application/json')
            var token = req.query.token

            if (!this._checkToken(token))
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
            else
                this._sendStatus(res, STATUS.OK, 0)
            
        })

        this.server = this.app.listen(6612, () => {
            Logger.info("Websocket API set up at port " + this.server.address().port)
        })
    }

    _sendStatus(res, status, code, msg) {
        let desc = (() => {
            switch (code) {
                case ERRCODE.INVALID_TOKEN: 
                    return "Invalid token."
                case ERRCODE.INVALID_GUILD: 
                    return "Invalid guild ID or no player active on this guild currently."
                case ERRCODE.INVALID_FILE:
                    return "File name not set."
                case ERRCODE.PLAYER_ERROR:
                    return msg ? msg : "Unknown player error."
                default:
                    return "OK"
            }
        })()
        res.send(JSON.stringify({ status, code, desc }, 0, 2))
    }

    _checkToken(token) {
        return token == this.token
    }

}



module.exports = Websocket