const Main = require('../main')
const Logger = require('../util/logger')
const { players, guildLog, Player } = require('../core/player')
const { info, error } = require('../util/msgs')
const path = require('path')

const express = require('express')
const hbs = require('express-handlebars')

// DEVTOKEN: zhyQUaHHdFwyUB7zW8GCB5Jb7AOh38e7AJgSuV4xdsN478lPxHtM2GGNAGqXpPT7

const WEBINTERFACE_VERSION = "1.6.1"

const STATUS = {
    ERROR: "ERROR",
    OK: "OK"
}

const ERRCODE = {
    OK: 0,
    INVALID_TOKEN:         1,
    INVALID_GUILD:         2,
    INVALID_FILE:          3,
    PLAYER_ERROR:          4,
    INVALID_LOGIN:         5,
    SESSION_NOT_LOGGED_IN: 6,
    NO_VC:                 7 
}

class Session {
    constructor(userid, token) {
        return new Promise((res, reject) => {
            this.userid = userid
            this.token = token
            Main.client.fetchUser(userid, true)
                .then(user => {
                    this.user = user
                    Main.client.guilds.forEach(g => {
                        let memb = g.members.find(m => m.id == this.user.id && m.voiceChannel)
                        if (memb) {
                            this.guild = g
                            this.player = players[g.id]
                            this.member = memb
                        }
                    })
                    if (this.member)
                        res(this)
                    else
                        reject({message: 'User not found in any voice channel!'})
                })
                .catch(reject)
        })
    }

    get vc() {
        return this.member.voiceChannel
    }
}

class Websocket {

    constructor() {
        this.sessions = {}
        this.ipregister = {}
        this.app = express()
        this.app.engine('hbs', hbs({
            extname: 'hbs',
            defaultLayout: 'layout',
            layoutsDir: __dirname + '/webinterface/layouts'
        }))
        this.app.set('views', path.join(__dirname, 'webinterface'))
        this.app.set('view engine', 'hbs')
        this.app.use(express.static(path.join(__dirname, 'webinterface')))
        this.token = Main.config.wstoken

        if (!this.token || this.token == "") {
            Logger.error("Can not set up Websocket API! Missing token in config!")
            return
        }

        // WEBINTERFACE
        this.app.get('/', (req, res) => {
            var user = req.query.user ? req.query.user : this.ipregister[req.connection.remoteAddress]
            var token = req.query.token
            var sortbydate = (req.query.sortbydate == 1)

            var session = this.sessions[user]

            if (!session) {
                res.render('login', { user, token })
                return
            }

            var fileList = Player.getFilelist(sortbydate)
                .map(f => f.split('.')[0])

            res.render('index', {
                fileList,
                user,
                usertag: session.user.tag,
                voicechannel: {
                    id: session.vc.id,
                    name: session.vc.name
                },
                guild: {
                    id: session.guild.id,
                    name: session.guild.name
                },
                sortbydate,
                token: session.token,
                inchannel: (session.guild.me.voiceChannel != null),
                WEBINTERFACE_VERSION
            })
        })

        // WEBINTERFACE LOGIN
        this.app.get('/wilogin', (req, res) => {
            var token = req.query.token
            var user = req.query.user

            if (!user || !token || user == "" || token == "") {
                res.render('error', {
                    code: ERRCODE.INVALID_LOGIN,
                    reason: "Invalid login credentials."
                })
                return
            }

            if (!this._checkToken(token)) {
                res.render('error', {
                    code: ERRCODE.INVALID_TOKEN,
                    reason: "Invalid token."
                })
                return
            }

            new Session(user, token)
                .then(session => {
                    this.sessions[user] = session
                    this.ipregister[req.connection.remoteAddress] = user
                    Logger.info(`[Websocket Login (WEB)] CID: ${user} | TAG: ${session.user.tag}`)
                    res.redirect('/?user=' + user)
                })
                .catch(e => {
                    res.render('error', {
                        code: ERRCODE.INVALID_LOGIN,
                        reason: e.message
                    })
                })
        })

        // WEBINTERFACE LOGOUT
        this.app.get('/wilogout', (req, res) => {
            var user = req.query.user

            if (!this._checkToken(req.query.token)) {
                res.send("")
                return
            }

            Logger.info(`[Websocket Logout (WEB)] CID: ${user} | TAG: ${this.sessions[user].user.tag}`)
            this.sessions[user] = null
            this.ipregister[req.connection.remoteAddress] = null
            res.redirect('/')
        })

        // WEBINTERFACE PLAY
        this.app.get('/wiplay', (req, res) => {
            var user = req.query.user
            var soundFile = req.query.file

            if (!this._checkToken(req.query.token)) {
                res.send("")
                return
            }

            var session = this.sessions[user]

            if (!user || !session)
                return

            new Promise((res, rej) => {
                var player = players[session.guild.id]
                if (player)
                    res(player)
                else
                    new Player(session.vc)
                        .then(p => res(p))
            }).then(player => {
                session.player = player
                player.play(soundFile, session.member).then(() => {
                    res.send()
                }).catch(e => {
                    console.log(e)
                    res.send()
                })
            }).catch(e => {
                console.log(e)
                res.send()
            })
        })

        // WEBINTERFACE RESTART BOT
        this.app.get('/wirestart', (req, res) => {
            var token = req.query.token
            var user = req.query.user
            if (!this._checkToken(token)) {
                res.send("")
                return
            }

            var session = this.sessions[user]

            new Promise((res, rej) => {
                if (session && session.vc)
                    session.vc.leave()
                        .then(res()).catch(rej())
                else
                    res()
            }).then(() => {
                process.exit();
            }).catch(() => {
                process.exit();
            })
            
            
        })

        // WEBINTERFACE STOP SOUND
        this.app.get('/wistop', (req, res) => {
            var user = req.query.user

            if (!this._checkToken(req.query.token)) {
                res.send("")
                return
            }

            var session = this.sessions[user]

            if (session && session.player) {
                session.player.stop();
                console.log("stopped")
            }
            
            res.send("")
        })

        // WEBINTERFACE SHOW LOG
        this.app.get('/wishowlog', (req, res) => {
            var guild = req.query.guild
            var user = req.query.user

            if (!this._checkToken(req.query.token)) {
                res.send("")
                return
            }

            var log = guildLog[guild]
            if (log == null) {
                res.render('error', {
                    code: 7,
                    reason: 'Guild not found in players log list.'
                })
                return
            }

            var session = this.sessions[user]
            if (!session) {
                res.render('error', {
                    code: ERRCODE.INVALID_LOGIN,
                    reason: 'Invalid session.'
                })
                return
            }

            // '`[05.07.2018 - 12:57:53]` - **3000** - *(zekro#9131)*'

            log = log
                .map(s => s.replace(/[`\*]/gm, ''))

            res.render('log', {
                guild: {
                    id: session.guild.id,
                    name: session.guild.name
                },
                log
            })
        })

        this.app.get('/wichannelaction', (req, res) => {
            var user = req.query.user

            if (!this._checkToken(req.query.token)) {
                res.send("")
                return
            }

            var session = this.sessions[user]

            if (session && session.vc) {
                var currchan = session.guild.me.voiceChannel
                console.log(currchan)
                if (currchan) {
                    if (session.player)
                        session.player.destroy()
                    else
                        currchan.leave()
                }
                else {
                    session.vc.join().catch()
                }
            }

            res.send('')
        }) 

        // LOGG IN AND CREATE SESSION FOR USER ID
        this.app.get('/login', (req, res) => {
            res.set('Content-Type', 'application/json')

            var token = req.query.token
            var userID = req.query.user

            if (!this._checkToken(token)) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                return
            }

            new Session(userID, token)
                .then(session => {
                    this._sendStatus(res, STATUS.OK, ERRCODE.OK)
                    this.sessions[userID] = session
                    this.ipregister[req.connection.remoteAddress] = userID
                    Logger.info(`[Websocket Login] CID: ${userID} | TAG: ${session.user.tag}`)
                })
                .catch(e => {
                    console.log(e)
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
                this.ipregister[req.connection.remoteAddress] = null
                this._sendStatus(res, STATUS.OK, ERRCODE.OK)
                Logger.info(`[Websocket Logout] CID: ${userID} | TAG: ${session.user.tag}`)
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
            
            if (!session.vc) {
                this._sendStatus(res, STATUS.ERROR, ERRCODE.NO_VC)
                return
            }

            new Promise(res => {
                // var player = players[session.guild.id]
                var player = session.player
                if (player)
                    res(player)
                else
                    new Player(session.vc)
                        .then(p => res(p))
            }).then(player => {
                session.player = player
                player.play(soundFile, session.member).then(() => {
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
                case ERRCODE.NO_VC:
                    return "USer not in voice channel."
                default:
                    return msg ? msg : "OK"
            }
        })()
        res.send(JSON.stringify({ status, code, desc }, 0, 2))
    }

    _checkToken(token) {
        return token == this.token
    }

}



module.exports = Websocket