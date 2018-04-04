const { client, config } = require('../main')
const Logger = require('../util/logger')
const { players } = require('./player')


client.on('voiceStateUpdate', (mold, mnew) => {
    let guild = mnew.guild
    let me = guild.me

    // Automatically quit voice channel if its empty
    if (mold.voiceChannel == me.voiceChannel) {
        if (me.voiceChannel.members.array().length == 1 && players[guild.id]) {
            setTimeout(() => {
                if (me.voiceChannel.members.array().length == 1 && players[guild.id]) {
                    players[guild.id].destroy()
                }
            }, 5000)
        }
    }

})