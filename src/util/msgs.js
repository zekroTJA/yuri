const { RichEmbed } = require('discord.js')

module.exports = {

    info(chan, cont, title) {
        return chan.send('', new RichEmbed()
            .setDescription(cont)
            .setTitle(title)
            .setColor(0x03A9F4)
        )
    },

    error(chan, cont, title) {
        return chan.send('', new RichEmbed()
            .setDescription(cont)
            .setTitle(title)
            .setColor(0xf44336)
        )
    }

}