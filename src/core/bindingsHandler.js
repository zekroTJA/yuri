const { client, config, settings } = require('../main')
const Logger = require('../util/logger')
const { players, Player } = require('../core/player')
const { info, error } = require('../util/msgs')


const FAST_TRIGGER_TIMEOUT = 250

bindings = {}


client.on('voiceStateUpdate', (mold, mnew) => {
    
    var memb = mnew
    var vc = memb.voiceChannel
    var guild = memb.guild
    var player = players[guild.id]

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

    if (!mold.selfMute && mnew.selfMute) {
        setTimeout(() => {
            if (!mnew.guild.members.find(m => m.id == mnew.id).selfMute) {
                
                // let binding = bindings[memb.id]
                let binding = settings.user(memb.id).binding
                if (binding) {
                    if (binding == 'r') {
                        _getPlayer()
                            .then(p => p.random(memb))
                            .catch(err => {
                                Logger.error('' + err)
                            })
                    }
                    else {
                        _getPlayer()
                            .then(p => {
                                p.play(binding, memb)
                            })
                            .catch(err => {
                                Logger.error('' + err)
                            })
                    }
                }
            }

        }, FAST_TRIGGER_TIMEOUT)
    }
})



function setBinding(chan, member, binding) {
    if (binding.toLowerCase() == 'reset') {
        // bindings[member.id] = null
        settings.set_user(member.id, { binding: null })
        settings.save()
        info(chan, 'Unbound fast key.')
            .then(m => m.delete(3500))
        return
    }
    if (binding.toLowerCase() == 'r') {
        // bindings[member.id] = 'r'
        settings.set_user(member.id, { binding: 'r' })
        settings.save()
        info(chan, 'Random sounds are now bound to fast key.')
            .then(m => m.delete(3500))
        return
    }
    let file = Player.getFilelist()
        .find(f => f.startsWith(binding.toLowerCase()))
    if (!file)
        error(chan, `Can not fetch any sound to the binding \`${binding}\`.`)
            .then(m => m.delete(3500))
    else {
        // bindings[member.id] = file
        settings.set_user(member.id, { binding: file })
        settings.save()
        info(chan, `\`${file.split('.')[0]}\` is now bound to fast key.`)
            .then(m => m.delete(3500))
    }
}


module.exports = {
    setBinding,
    bindings
}