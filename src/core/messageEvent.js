const { client, config } = require('../main')
const Logger = require('../util/logger')
const { players, Player } = require('../core/player')
const { info, error } = require('../util/msgs')


client.on('message', (msg) => {
    var cont = msg.content
    if (msg.author.id == client.user.id || msg.channel.type == "dm" || !cont.startsWith(config.prefix))
        return

    var chan = msg.channel
    var memb = msg.member
    var vc = memb.voiceChannel
    var guild = msg.guild
    var player = players[guild.id]
    var invoke = cont.split(' ')[0].replace(config.prefix, '')
    var args = cont.split(' ').slice(1)


    function _getPlayer() {
        return new Promise((resolve, reject) => {
            if (player) {
                resolve(player)
                if (vc != player.vc) {
                    vc.join()
                        .then(() => {
                            player.vc = vc
                        })
                }
            }
            else {
                new Player(vc)
                    .then(p => {
                        player = p
                        resolve(p)
                        if (vc != player.vc) {
                            vc.join()
                                .then(() => {
                                    player.vc = vc
                                })
                        }
                    })
                    .catch(reject)
            }
        }) 
    }


    switch(invoke) {

        /*
            NEEDED COMMANDS:
            - help
            - info
            - list
            - summon
            - prank
            - vol
            - blacklist
            - disable
            - log
            - lockchan
            - reload
            - rename
            - stats
            - search
        */

        case 'ls':
        case 'list':
            console.log(Player.getFilelist(true))
            break

        // QUIT COMMAND
        case 'quit':
            if (player) {
                player.vc.leave()
                players[guild.id] = null
            }
            break

        // STOP COMMAND
        case 'stop':
            if (player) {
                player.stop()
            }
            break

        // SUMMON COMMAND
        case 'summon':
            if (!vc) {
                error(chan, 'You need to be in a voice channel to summon me.')
                    .then(m => m.delete(3500))
                return
            }
            _getPlayer()
            break

        // RANDOM COMMAND
        case 'r':
        case 'rand':
        case 'random':
            _getPlayer()
                .then(p => p.random()
                    .then(() => msg.delete())
                )
                .catch(err => {
                    Logger.error('' + err)
                    error(chan, 'Could not connect to voice channel.\nMissing permissions?')
                        .then(m => m.delete(3500))
                })
            break

        // PLAY SOUND COMMAND
        default:
            if (!vc) {
                error(chan, 'You need to be in a voice channel to play sounds.')
                    .then(m => m.delete(3500))
                return
            }
            _getPlayer()
                .then(p => {
                    p.play(invoke)
                        .then(() => msg.delete())
                })
                .catch(err => {
                    Logger.error('' + err)
                    error(chan, 'Could not connect to voice channel.\nMissing permissions?')
                        .then(m => m.delete(3500))
                })
    }

})