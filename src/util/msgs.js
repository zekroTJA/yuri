const { RichEmbed } = require('discord.js')

module.exports = {

    info(chan, cont, title) {
        let emb = new RichEmbed()
            .setDescription(cont)
            .setColor(0x03A9F4)
        if (title)
            emb.setTitle(title)
        return chan.send('', emb)
    },

    error(chan, cont, title) {
        let emb = new RichEmbed()
            .setDescription(cont)
            .setColor(0xf44336)
        if (title)
            emb.setTitle(title)
        return chan.send('', emb)
    }

}