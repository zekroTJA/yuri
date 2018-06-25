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
    INVALID_TOKEN        : 1,
    INVALID_GUILD        : 2,
    INVALID_FILE         : 3,
    PLAYER_ERROR         : 4,
    INVALID_LOGIN        : 5,
    SESSION_NOT_LOGGED_IN: 6
}

class Session {
    constructor(userid) {
        return new Promise((res, reject) => {
            this.userid = userid;
            Main.client.fetchUser(userid, true)
                .then(user => {
                    this.user = user
                    Main.client.guilds.forEach(g => {
                        let memb = g.members.find(m => m.id == this.user.id && m.voiceChannel)
                        if (memb) {
                            this.guild = g
                            this.member = memb
                            this.vc = memb.voiceChannel
                        }
                    })
                    if (this.member)
                        res(this)
                    else
                        reject('No member found!')
                })
                .catch(reject)
        })
    }
}

class Websocket {

    constructor() {

        this.sessions = {}
        this.app = express()
        this.token = Main.config.wstoken

        if (!this.token || this.token == "") {
            Logger.error("Can not set up Websocket API! Missing token in config!")
            return
        }

        // LOGG IN AND CREATE SESSION FOR USER ID
        this.app.get('/login', (req, res) => {
            res.set('Content-Type', 'application/json')

            var token = req.query.token
            var userID = req.query.user

            if (!this._checkToken(token)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                return
            }

            new Session(userID)
                .then(session => {
                    this._sendStatus(res, STATUS.OK, ERRCODE.OK)
                    this.sessions[userID] = session
                    Logger.info(`[Websocket Login] ${req.connection.remoteAddress} (CID: ${userID} | TAG: ${session.user.tag})`)
                })
                .catch(e => {
                    this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_LOGIN, e.message)
                })
        })

        // LOGGOUT
        this.app.get('/logout', (req, res) => {
            res.set('Content-Type', 'application/json')

            var token = req.query.token
            var userID = req.query.user

            if (!this._checkToken(token)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                return
            }

            var session = this.sessions[userID]
            if (session) {
                this.sessions[userID] = null
                this._sendStatus(res, STATUS.OK, ERRCODE.OK)
                Logger.info(`[Websocket Logout] ${req.connection.remoteAddress} (CID: ${userID} | TAG: ${session.user.tag})`)
            }
            else
                this._sendStatus(res, STATUS.ERROR, ERRCODE.SESSION_NOT_LOGGED_IN)
        })

        // PLAY SOUND METHOD
        this.app.get('/play', (req, res) => {
            res.set('Content-Type', 'application/json')
            
            var token = req.query.token
            var userID = req.query.user
            var soundFile = req.query.file

            if (!this._checkToken(token)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                return
            }

            var session = this.sessions[userID]

            if (!session) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.SESSION_NOT_LOGGED_IN)
                return
            }

            if (!soundFile || soundFile == "") {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_GUILD)
                return
            }
            
            new Promise((res, rej) => {
                var player = players[session.guild.id]
                if (player)
                    res(player)
                else
                    new Player(session.vc)
                        .then(p => res(p))
            }).then(player => {
                player.play(soundFile).then(() => {
                    this._sendStatus(res, STATUS.OK, 0)
                }).catch(e => {
                    this._sendStatus(res, STATUS.ERROR, ERRCODE.PLAYER_ERROR, e.message)
                })
            }).catch(e => {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.PLAYER_ERROR, e.message)
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
                case ERRCODE.INVALID_LOGIN:
                    return msg ? msg : "Invalid login."
                case ERRCODE.SESSION_NOT_LOGGED_IN:
                    return "Session not logged in."
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