const { client, config } = require('../main')
const Logger = require('../util/logger')
const { listMsgs, SoundsList } = require('../util/soundsList')


client.on('messageReactionAdd', (reaction, user) => {
    var msg = reaction.message
    var guild = msg.guild
    var listMsg = listMsgs[guild.id]
    if (user.id != client.user.id && listMsg && listMsg.msg == msg) {
        if (reaction.emoji == "\👉")
            listMsg.swap(true)
        else if (reaction.emoji == "\👈")
            listMsg.swap()
        reaction.remove(user)
    }
})