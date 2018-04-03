const { client, config } = require('../main')
const Logger = require('../util/logger')


client.on('ready', () => {
    Logger.info(
        `Logged in as ${client.user.tag}\n` +
        `Invite Link:\nhttps://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=120679504`
    )
})