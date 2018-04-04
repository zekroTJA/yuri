const { client, config } = require('../main')


const ROTA_TIMEOUT = 15 * 1000 // 15 seconds


setInterval(() => {
    let rota = config.gamerota
    client.user.setPresence({
        game: { name: rota[Math.floor(Math.random() * rota.length)] }
    })
}, ROTA_TIMEOUT)