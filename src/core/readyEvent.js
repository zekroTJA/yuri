const { client, config, DEBUG_MODE } = require('../main')
const { RichEmbed } = require('discord.js')
const Logger = require('../util/logger')
const fs = require('fs')


client.on('ready', () => {
    Logger.info(
        `Logged in as ${client.user.tag}\n` +
        `Invite Link:\nhttps://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=120679504`
    )
    if (fs.existsSync('RESTARTING')) {
        var filecont = fs.readFileSync('RESTARTING', 'utf8').split(':')
        var guild = client.guilds.find(g => g.id == filecont[0])
        if (guild)
            var chan = guild.channels.find(c => c.id == filecont[1])
        if (chan)
            chan.fetchMessage(filecont[2])
                .then(m => {
                    m.edit('', new RichEmbed()
                        .setColor(0x27f907)
                        .setDescription('Restart completed :ok_hand:'))
                    fs.unlink('RESTARTING')
                    })
    }
    if (DEBUG_MODE) {
        Logger.info("Testing complete. Shutting down...")
        process.exit(0)
    }
})