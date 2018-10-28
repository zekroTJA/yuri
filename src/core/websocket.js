const Main = require('../main')
const Logger = require('../util/logger')
const { players, guildLog, Player } = require('../core/player')
const { info, error } = require('../util/msgs')
const path = require('path')
const EventEmitter = require('events');
const DicordOAuth = require('../util/discordOAuth')
const { randomString } = require('../util/random')
const Snowflake = require('../util/snowflake')

const express = require('express')
const hbs = require('express-handlebars')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const socketio = require('socket.io')
const http = require('http')
const https = require('https')
const sha256 = require('sha256')
const fs = require('fs')


const WEBINTERFACE_VERSION = '1.11.0'
const SESSION_TIMEOUT = 1800 * 1000   // 30 Minutes
const LOGIN_TIMEOUT = 30 * 1000       // 30 Seconds
const EXPOSE_PORT = process.argv.includes("--1337") ? 1337 : 6612

var sessionNode = new Snowflake.Node()

const STATUS = {
    ERROR: 'ERROR',
    OK: 'OK'
}

const ERRCODE = {
    OK: 0,
    INVALID_TOKEN:         1,
    INVALID_GUILD:         2,
    INVALID_FILE:          3,
    PLAYER_ERROR:          4,
    INVALID_LOGIN:         5,
    SESSION_NOT_LOGGED_IN: 6,
    NO_VC:                 7,
    LOGIN_TIMED_OUT:       8,
    INTERNAL_ERROR:        9
}

class Session {
    constructor(userid, token, code) {
        return new Promise((res, reject) => {
            this.uid = sessionNode.next()
            this.userid = userid
            this.token = token
            this.code = code
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
                    if (this.member) {
                        res(this)
                        this.timer = new SessionTimer(SESSION_TIMEOUT)
                    }
                    else
                        reject({message: 'User not found in any voice channel!'})
                })
                .catch(reject)
        })
    }

    get vc() {
        return this.member.voiceChannel
    }

    checkCode(code) {
        return code == this.code
    }

}


class SessionTimer extends EventEmitter {
    constructor(timeout) {
        super()
        this.timeout = timeout
        this.create()
    }

    create() {
        this.timer = setTimeout(() => {
            this.emit('elapsed')
        }, this.timeout)
    }

    refresh() {
        clearTimeout(this.timer)
        this.create()
    }
}

class Websocket {

    constructor() {
        this.sessions = {}
        this.authorizedids = {}
        this.oauth = new DicordOAuth({
            clientid:     Main.config.client.id,
            clientsecret: Main.config.client.secret,
            serveraddr:   Main.config.serveraddr
        })
        this.app = express()
        this.app.engine('hbs', hbs({
            extname: 'hbs',
            defaultLayout: 'layout',
            layoutsDir: __dirname + '/webinterface/layouts'
        }))
        this.app.use(bodyParser.json())
        this.app.use(cookieParser())
        this.app.set('views', path.join(__dirname, 'webinterface'))
        this.app.set('view engine', 'hbs')
        this.app.use(express.static(path.join(__dirname, 'webinterface/static')))
        this.server = (() => {
            if (Main.config.cert &&
                Main.config.cert.keyfile && 
                Main.config.cert.certfile &&
                fs.existsSync(Main.config.cert.keyfile) &&
                fs.existsSync(Main.config.cert.certfile)
            ) {
                return https.createServer({
                    key: fs.readFileSync(Main.config.cert.keyfile),
                    cert: fs.readFileSync(Main.config.cert.certfile)
                }, this.app)
            } else {
                Logger.warning('Web server running on NON TLS mode!')
                return new http.Server(this.app)
            }
        })();
        this.io = socketio(this.server)
        this.token = Main.config.wstoken

        if (!this.token || this.token == "") {
            Logger.error('Can not set up Websocket API! Missing token in config!')
            return
        }

          ///////////////////////
         //// WEB INTERFACE ////
        ///////////////////////

        // WEBINTERFACE
        this.app.get('/', (req, res) => {
            var sessionid = req.cookies.sessionid
            if (sessionid) {
                let session = Object.values(this.sessions).find(s => s && s.uid == sessionid)
                if (session)
                    var sessionuserid = session.userid
            }

            var user = req.query.user || sessionuserid

            if (!user) {
                this.oauth.redirectToAuth('authorize', res)
                return
            }
            var session = this.sessions[user]
            var sortbydate = (req.query.sortbydate == 1)
            if (session && session.vc) {
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
                    token: session.code,
                    inchannel: (session.guild.me.voiceChannel != null),
                    WEBINTERFACE_VERSION
                })
            } else {
                this.oauth.redirectToAuth('authorize', res)  
            }
        })

        // OAUTH AUTHORIZATION
        this.app.get('/authorize', (req, res) => {
            let code = req.query.code;
            let resetToken = req.query.resetToken

            if (resetToken) {
                let user = req.query.user
                res.render('login', { user, resetToken })
            }

            this.oauth.getId(req, (err, user) => {
                if (err) {
                    this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_LOGIN)
                    return
                }
                var sortbydate = (req.query.sortbydate == 1)
                var session = this.sessions[user]
                let hashedCode = sha256(code)
                this.authorizedids[user] = hashedCode
                setTimeout(() => {
                    delete this.authorizedids[user]
                }, LOGIN_TIMEOUT)

                if (!session) {
                    res.render('login', { user, code: hashedCode })
                    return
                }
                if (!session.vc) {
                    this.sessions[user] = null
                    res.render('login', { user, code: hashedCode })
                    return
                }
                this.sessions[user].code = hashedCode
                res.redirect('/?user=' + user)
            })
        })

        // WEBINTERFACE LOGIN
        this.app.get('/wilogin', (req, res) => {
            var token = req.query.token
            var user = req.query.user
            var code = req.query.code
            var passedByToken = req.query.passedByToken

            if (!user || !token || user == "" || token == "") {
                res.render('error', {
                    code: ERRCODE.INVALID_LOGIN,
                    reason: 'Invalid login credentials.'
                })
                return
            }

            if (!this.authorizedids[user]) {
                res.render('error', {
                    code: ERRCODE.LOGIN_TIMED_OUT,
                    reason: 'Login timed out.'
                })
                return
            }

            if (this.authorizedids[user] != code) {
                res.render('error', {
                    code: ERRCODE.INVALID_LOGIN,
                    reason: 'Login ID and response code hash does not match.'
                })
                return
            }

            if (!this._checkToken(token)) {
                if (passedByToken == '1') {
                    res.render('resetTokenCookie', {
                        code: ERRCODE.INVALID_TOKEN,
                        reason: 'Invalid token.'
                    })
                    return
                }
                res.render('error', {
                    code: ERRCODE.INVALID_TOKEN,
                    reason: 'Invalid token.'
                })
                return
            }

            new Session(user, token, code)
                .then(session => {
                    session.timer.on('elapsed', () => {
                        Logger.info(`[WS Session Expired] CID: ${user} | TAG: ${session.user.tag}`)
                        let socket = session.socket
                        if (socket)
                            socket.emit('logout')
                        this.sessions[user] = null
                    })
                    this.sessions[user] = session
                    console.log(req.connection.remoteAddress)
                    Logger.info(`[WS Login (WEB)] CID: ${user} | TAG: ${session.user.tag}`)
                    
                    res.set('Set-Cookie', `sessionid=${session.uid}; Expires=${new Date(Date.now() + SESSION_TIMEOUT).toUTCString()}; Path=/`)
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

            if (!this.sessions[user].checkCode(req.query.token)) {
                res.send("")
                return
            }

            Logger.info(`[WS Logout (WEB)] CID: ${user} | TAG: ${this.sessions[user].user.tag}`)
            this.sessions[user] = null
            res.redirect('/')
        })

        // WEBINTERFACE RESTART BOT
        this.app.get('/wirestart', (req, res) => {
            var token = req.query.token
            var user = req.query.user
            if (!this.sessions[user].checkCode(token)) {
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

        // WEBINTERFACE SHOW LOG
        this.app.get('/wishowlog', (req, res) => {
            var guild = req.query.guild
            var user = req.query.user

            if (!this.sessions[user].checkCode(req.query.token)) {
                res.render('error', {
                    code: ERRCODE.INVALID_LOGIN,
                    reason: 'Invalid login.'
                })
                return
            }

            var log = guildLog[guild]
            if (log == null) {
                res.render('error', {
                    code: ERRCODE.NO_VC,
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

            session.timer.refresh()

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

        // WEBINTERFACE MANAGE TOKEN
        this.app.get('/wimanagetoken', (req, res) => {
            var user = req.query.user
            var token = req.query.token

            if (!this.sessions[user].checkCode(token)) {
                res.render('error', {
                    code: ERRCODE.INVALID_LOGIN,
                    reason: 'Invalid login.'
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

            session.timer.refresh()

            Main.database.all('SELECT * FROM apitokens WHERE uid = ?', [user], (err, rows) => {
                if (err) {
                    res.render('error', {
                        code: ERRCODE.INTERNAL_ERROR,
                        reason: 'Internal error: ' + err
                    })
                    return
                }
                if (rows.length < 1) {
                    res.render('tokenManager', {
                        token: token,
                        user: user,
                        generated: false
                    })
                } else {
                    res.render('tokenManager', {
                        token: token,
                        user: user,
                        generated: true,
                        apitoken: rows[0].token,
                        createdat: rows[0].createdAt
                    })
                }
            })

            
        })

        // WEBINTERFACE REFRESH TOKEN
        this.app.get('/witokenrefresh', (req, res) => {
            var user = req.query.user
            var token = req.query.token

            if (!this.sessions[user].checkCode(token)) {
                res.render('error', {
                    code: ERRCODE.INVALID_LOGIN,
                    reason: 'Invalid login.'
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

            let apitoken = sha256(this.token) + '.' + randomString(32)

            Main.database.run(
                'INSERT OR IGNORE INTO apitokens (uid, token, createdAt) VALUES (?, ?, ?);',
                [user, apitoken, Date.now().toString()], 
                (err) => {
                    if (err) {
                        res.render('error', {
                            code: ERRCODE.INTERNAL_ERROR,
                            reason: 'Internal error: ' + err
                        })
                        return
                    }
                    Main.database.run(
                        'UPDATE apitokens SET token = ?, createdAt = ? WHERE uid = ?;',
                        [apitoken, Date.now().toString(), user],
                        (err) => {
                            if (err) {
                                res.render('error', {
                                    code: ERRCODE.INTERNAL_ERROR,
                                    reason: 'Internal error: ' + err
                                })
                                return
                            }
                            res.redirect(`/wimanagetoken?user=${user}&token=${token}`)
                        }
                    )
                }
            )

            
        })

          /////////////
         //// API ////
        /////////////

        this.app.get('/api', (req, res) => {
            res.set('Content-Type', 'application/json')

            this._sendStatus(res, STATUS.OK, ERRCODE.OK, {
            })
        })

        // LOG IN AND CREATE SESSION FOR USER ID
        this.app.post('/api/login', (req, res) => {
            res.set('Content-Type', 'application/json')

            var token = req.headers.authorization || req.body.token

            this._checkAPIToken(token, (userID) => {
                if (!userID) {
                    this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                    return
                }
                new Session(userID, this.token, token)
                    .then(session => {
                        this._sendStatus(res, STATUS.OK, ERRCODE.OK, {
                            userid: session.userid,
                            code: session.code,
                            guild: {
                                name: session.guild.name,
                                id: session.guild.id,
                                ownerid: session.guild.ownerID
                            },
                            member: {
                                displayName: session.member.displayName,
                                username: session.member.user.username,
                                tag: session.member.user.tag,
                                id: session.member.id
                            }
                        })
                        session.timer.on('elapsed', () => this.sessions[user] = null)
                        this.sessions[userID] = session
                        console.log(req.connection.remoteAddress)
                        Logger.info(`[API Login] CID: ${userID} | TAG: ${session.user.tag}`)
                    })
                    .catch(e => {
                        console.log(e)
                        this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_LOGIN, e.message)
                    })
            })
        })

        // LOGGOUT
        this.app.post('/api/logout', (req, res) => {
            res.set('Content-Type', 'application/json')

            var token = req.headers.authorization || req.body.token

            this._checkAPIToken(token, (userID) => {
                if (!userID) {
                    this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                    return
                }
                var session = this.sessions[userID]
                if (session) {
                    this.sessions[userID] = null
                    this._sendStatus(res, STATUS.OK, ERRCODE.OK)
                    Logger.info(`[WS Logout] CID: ${userID} | TAG: ${session.user.tag}`)
                }
                else
                    this._sendStatus(res, STATUS.ERROR, ERRCODE.SESSION_NOT_LOGGED_IN)
            })
        })

        // PLAY SOUND METHOD
        this.app.post('/api/play', (req, res) => {
            res.set('Content-Type', 'application/json')
            
            var token = req.headers.authorization || req.body.token
            var soundFile = req.body.file
            console.log(req.body)

            this._checkAPIToken(token, (userID) => {
                if (!userID) {
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
    
                session.timer.refresh()
    
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
        })

        // GET SOUND FILES
        this.app.get('/api/sounds', (req, res) => {
            res.set('Content-Type', 'application/json')

            var token = req.headers.authorization || req.body.token

            this._checkAPIToken(token, (userID) => {
                if (!userID) {
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
        })

        // SET GUILDS AND IDS
        // DEPRECATED
        this.app.get('/api/guilds', (req, res) => {
            res.set('Content-Type', 'application/json')
            
            var token = req.headers.authorization || req.body.token

            this._checkAPIToken(token, (userID) => {
                if (!userID) {
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
        })

        // CHECK TOKEN
        this.app.get('/api/token', (req, res) => {
            res.set('Content-Type', 'application/json')

            var token = req.headers.authorization || req.body.token

            this._checkAPIToken(token, (userID) => {
                if (!userID) {
                    this._sendStatus(res, STATUS.ERROR, ERRCODE.INVALID_TOKEN)
                    return
                }
                this._sendStatus(res, STATUS.OK, 0)
            })
        })

        this.server.listen(EXPOSE_PORT, () => {
            Logger.info(
                'WS API set up at port ' + this.server.address().port + '\n' +
                'Access on URL ' + Main.config.serveraddr
            )
        })


        this.io.on('connection', (socket) => {
            var session
            Logger.info('WS onnection etablished: ' + socket.id)

            socket.on('thatsMe', (data) => {
                session = this.sessions[data.user]
                if (!session) {
                    socket.emit('logout')
                    socket.disconnect()
                    return;
                }
                let user = session.member.user
                socket.join(session.guild.id)
                session.socket = socket
                let guildsessions = Object.keys(this.sessions)
                    .filter(k => this.sessions[k] && this.sessions[k].guild && this.sessions[k].guild.id == session.guild.id && this.sessions[k].socket)
                    .map(k => this.sessions[k].member.user)
                let alreadyConnected = []
                guildsessions.forEach(u => alreadyConnected.push({ id: u.id, tag: u.tag, avatarURL: u.avatarURL }))
                this.io.to(session.guild.id).emit('userConnected', alreadyConnected)
            })

            socket.on('disconnecting', (socket) => {
                Logger.info("WS onnection closed")
                if (session) {
                    let user = session.member.user
                    this.io.to(session.guild.id).emit('userDisconnected', { id: user.id, tag: user.tag })
                    session.socket = null
                }
            })

            socket.emit('whoAreYou')

            socket.on('changeChannelStatus', () => {
                if (session && session.vc) {
                    session.timer.refresh()
                    var currchan = session.guild.me.voiceChannel
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
            })

            socket.on('stopSound', () => {
                if (session && session.player) {
                    session.player.stop()
                    session.timer.refresh()
                }
            })

            // PLAY EVENT
            socket.on('playSound', (data) => {
                var user = data.user
                var soundFile = data.sound

                if (!user || !session)
                    return

                session.timer.refresh()

                new Promise((res, rej) => {
                    var player = players[session.guild.id]
                    if (player)
                        res(player)
                    else
                        new Player(session.vc)
                            .then(p => res(p))
                }).then(player => {
                    session.player = player
                    let sockets = this.io.to(session.guild.id) //.of(session.guild.id)
                    player.play(soundFile, session.member).then(() => {
                        sockets.emit('soundPlaying', { user, sound: soundFile })
                        player.dispatcher.on('end', () => {
                            sockets.emit('soundStopped', { user, sound: soundFile })
                        })
                    }).catch(e => {
                        sockets.emit('playError', { user, sound: soundFile, error: e })
                        console.log(e)
                    })
                }).catch(e => {
                    sockets.emit('playError', { user, sound: soundFile, error: e })
                    console.log(e)
                })
            })

            Main.client.on('voiceStateUpdate', (oldMemb, newMemb) => {
                let session = this.sessions[oldMemb.id]
                if (session && session.socket && oldMemb.voiceChannel && !newMemb.voiceChannel) {
                    session.socket.emit('logout')
                }
                if (oldMemb.id != Main.client.user.id)
                    return
                if (!oldMemb.voiceChannel && newMemb.voiceChannel) {
                    let vc = newMemb.voiceChannel
                    this.io.emit('channelJoined', vc.id)
                }
                else if (oldMemb.voiceChannel && !newMemb.voiceChannel) {
                    let vc = oldMemb.voiceChannel
                    this.io.emit('channelLeft', vc.id)
                }
            })

            Main.eventEmiter.on('closing', () => {
                this.io.emit('logout')
            })
        })
    }

    _sendStatus(res, status, code, msg) {
        let desc = (() => {
            switch (code) {
                case ERRCODE.INVALID_TOKEN: 
                    return 'Invalid token.'
                case ERRCODE.INVALID_GUILD: 
                    return 'Invalid guild ID or no player active on this guild currently.'
                case ERRCODE.INVALID_FILE:
                    return 'File name not set.'
                case ERRCODE.PLAYER_ERROR:
                    return msg ? msg : 'Unknown player error.'
                case ERRCODE.INVALID_LOGIN:
                    return msg ? msg : 'Invalid login.'
                case ERRCODE.SESSION_NOT_LOGGED_IN:
                    return 'Session not logged in.'
                case ERRCODE.NO_VC:
                    return 'User not in voice channel.'
                default:
                    return msg ? msg : "OK"
            }
        })()
        res.send(JSON.stringify({ status, code, desc }, 0, 2))
    }

    _checkToken(token) {
        return token == this.token
    }

    _checkAPIToken(token, cb) {
        if (!token || token.length < 97 || !token.includes('.') || sha256(this.token) != token.split('.')[0]) {
            cb()
            return
        }
        Main.database.all('SELECT * FROM apitokens WHERE token = ?;', [token], (err, rows) => {
            if (err || !rows || rows.length < 1) {
                cb()
                return
            }
            cb(rows[0].uid)
        })
    }

}



module.exports = Websocket