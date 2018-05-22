const Logger = require('../util/logger')
const BindingHandler = require('./bindingsHandler')
const fs = require('fs')
const { client, config, reloadConfig, settings } = require('../main')
const { players, Player, guildLog, soundStats } = require('./player')
const { info, error } = require('../util/msgs')
const { listMsgs, SoundsList } = require('../util/soundsList')
const { RichEmbed } = require('discord.js')
const { TokenSystem } = require('./tokenSystem.js')

var tokenHandler = new TokenSystem(client)


client.on('message', (msg) => {
    var cont = msg.content
    if (msg.author.id == client.user.id || msg.channel.type == "dm" || !cont.startsWith(config.prefix))
        return

    var chan = msg.channel
    var memb = msg.member
    var vc = memb.voiceChannel
    var guild = memb.guild
    var player = players[guild.id]
    var invoke = cont.split(' ')[0].replace(config.prefix, '')
    var args = cont.split(' ').slice(1)

    if (settings.enableticketsystem && !tokenHandler.check(guild) && memb.id != config.owner) {
        error(chan, 'This bot needs to be accepted for your guild. Please request a token from the host:\n```zekro#9131\ndiscord.zekro.de```')
        return
    }

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


    if (invoke == 'disable' || invoke == 'enable') {
        if (memb.id != config.owner) {
            error(chan, 'Only the bot\'s owner can disable or enable the sound bot.')
            return
        }
        if (players[guild.id])
            info(chan, `Soundboard is now **${players[guild.id].switchDisable() ? 'disabled' : 'enabled'}**.`)
        else
            error(chan, 'Soundboard has currently no player for this guild to disable.')
                .then(m => m.delete(3500))
        return
    }

    if (players[guild.id] && players[guild.id].disabled) {
        error(chan, 'Soundboard is currently disabled by owner.')
            .then(m => m.delete(3500))
        return
    }

    switch(invoke) {

        /*
            NEEDED COMMANDS:
            - prank
            - vol
            - blacklist
            - lockchan
            - rename
        */

        // HELP COMMAND
        case 'help':
            let help_cmds = {
                'log': ['logs, history', 'display guilds sound history'],
                'search <query/regexp>': ['s', 'search for sounds by query or regexp'],
                'disable': ['enable', 'disable or enable the soundboatd [OWNER ONLY]'],
                'bind <sound>/r/reset': ['', 'bind a sound or random sounds to the fast key, "reset" to reset'],
                'list [s]': ['ls', 'List all sounds (add argument "s" for time-sorted list)'],
                'quit': ['', 'Quit current voice channel'],
                'stop': ['', 'Stop currently playing sound (does not quit channel)'],
                'summon': ['', 'Summons the bot in the voice channel without playing a sound'],
                'random': ['r, rand', 'Play a random sound'],
                '<sound>': ['', 'Play a sound'],
                'help': ['', 'Display this help message'],
                'info': ['', 'Display some info about this bot'],
                'stats': ['top', 'Display top 30 sounds by played times']
            }
            info(chan,
                Object.keys(help_cmds)
                    .sort()
                    .map(k => `:white_small_square:  \`${config.prefix}${k}\` ${help_cmds[k][0].length > 0 ? `- [\`${help_cmds[k][0]}\`]` : ''} - ${help_cmds[k][1]}`)
                    .join('\n'),
                ':notebook_with_decorative_cover:  COMMANDS'
            )
            // Getting output as markdown table for documentation
            Logger.debug(
                '**Command** | **Aliases** | **Description**\n' +
                '|----|----|----|\n' +
                Object.keys(help_cmds)
                    .sort()
                    .map(k => `| ${k} | ${help_cmds[k][0].length > 0 ? help_cmds[k][0] : '-/-'} | ${help_cmds[k][1]} |`)
                    .join('\n')
            )
            break

        // INFO COMMAND
        case 'info':
            chan.send('', new RichEmbed()
                .setTitle(':information_source:   INFO')
                .setColor(0x03A9F4)
                .setThumbnail(client.user.avatarURL)
                .setDescription('Discord SoundBoard created with discord.js (NodeJS).\n' +
                                '\© 2018-present Ringo Hoffmann (zekro Development)')
                .addField('GitHub Repository', ':link:  [**github.com/zekrotja/yuri**](https://github.com/zekrotja/yuri)')
                .addField('Invite Link', `:inbox_tray:  [**Invite the bot to your server**](https://discordapp.com/oauth2/authorize?client_id=${client.user.id}&scope=bot&permissions=120679504)`)
                .addField('Used 3rd Party Packages', '- [discord.js](https://github.com/hydrabolt/discord.js)\n' +
                                                     '- [node-opus](https://github.com/Rantanen/node-opus)\n' +
                                                     '- [colors](https://github.com/Marak/colors.js)')
            )
            break

        // CLOC COMMAND
        case 'cloc':
            require('../util/cloc').cloc(out => {
                info(chan, '```yaml\n' + out + '\n```')
            })
            break

        // TOKEN GENERATION COMMAND
        case 'tokens':
            if (!config.owner && memb.id != config.owner) return
            let amm = parseInt(args[0])
            if (isNaN(amm) || amm < 1) return
            tokenHandler.generateRandomTokens(memb, amm)
            msg.delete()
            break

        // VOLUME COMMAND
        case 'volume':
        case 'vol':
            if (!args[0]) {
                error(chan, 'Set the volume of the player on this guild (in %, between `1` and `200`).')
                return
            }
            let _vol = parseInt(args[0])
            if (isNaN(_vol) || _vol < 1 || _vol > 200) {
                error(chan, 'Please enter a valid volume number between `1` and `200` (in %).')
                return
            }
            settings.set_guild(guild.id, { volume: (_vol / 100) })
            info(chan, `Set guilds player volume to \`${_vol} %\`.`)
            break

        // RESTART COMMAND
        case 'restart':
            info(chan, 'Restarting :wave:', null, 0xf9dd07).then(m => {
                if (player) {
                    if (players[guild.id]) {
                        players[guild.id].destroy()
                    }
                    else {
                        player.vc.leave()
                    }
                }
                fs.writeFileSync('RESTARTING', `${guild.id}:${chan.id}:${m.id}`)
                process.exit()
            })
            break

        // RELOAD COMMAND
        case 'reload':
            if (reloadConfig)
                info(chan, 'Config reloaded.')
            else
                error(chan, 'Failed reloading config.')
            break

        // STATS COMMAND
        case 'stats':
        case 'top':
            if (!config.writestats)
                error(chan, 'Sound stats are disabled by config.')
            else if (soundStats == {})
                info(chan, '*Stats are currently empty*', 'TOP 20 SOUNDS')
            else {
                info(
                    chan, 
                    Object.keys(soundStats)
                        .sort((a, b) => soundStats[b] - soundStats[a])
                        .slice(0, 20)
                        .map((k, i) => `**${i}** - **\`[${soundStats[k]}]\`** - ${k}`)
                        .join('\n'),
                    'TOP 20 SOUNDS'
                )
            }
            break

        // LOGS COMMAND
        case 'log':
        case 'logs':
        case 'history':
            let log = guildLog[guild.id]
            if (!log || log.length == 0)
                info(chan, '*Log is currently empty*')
            else
                info(chan, log.reverse().join('\n'), 'Guild Sounds Log')
            break

        // SEARCH COMMAND
        case 's':
        case 'search':
            if (!args[0])
                error(chan, 'Please enter a valid search query at the end of the command!\n' +
                            'Use `*` to search for sounds staring or ending with a specific string.\n' +
                            'Following you can also use regex to search for sounds: `/<string>/`.')
            let _files = Player.getFilelist()
                .map(f => f.split('.')[0])
            let query = args.join(' ')
            let filtered
            if (query.indexOf('*') == 0)
                filtered = _files.filter(f => f.endsWith(query.replace(/\*/g, '').toLowerCase()))
            else if (query.indexOf('*') > 0)
                filtered = _files.filter(f => f.startsWith(query.replace(/\*/g, '').toLowerCase()))
            else if (query.startsWith('/') && query.endsWith('/')) {
                let regexp = new RegExp(query.substring(1, query.length - 1))
                filtered = _files.filter(f => regexp.test(f))
            }
            else {
                filtered = _files.filter(f => f.indexOf(query.toLowerCase()) > -1)
            }
            if (filtered.length == 0)
                info(chan, '*No results*', `Results for '${query}'`)
            else if (filtered.length > 50)
                error(chan, 'Too many search results')
                    .then(m => m.delete(3500))
            else
                info(chan, filtered.join('\n'), `Results for '${query}'`)
            break

        // BIND COMMAND
        case 'bind':
            if (args[0])
                BindingHandler.setBinding(chan, memb, args[0])
            else
                error(chan, 'Please enter a valid sound name to bind, `r` to bind random sounds or use `reset` to reset the binding.')
            break

        // LIST COMMAND
        case 'ls':
        case 'list':
            let files = Player.getFilelist(['s', 'sorted', 'sort', 'time'].indexOf(args[0]) > -1)
            new SoundsList(files, msg)
                .then(() => msg.delete())
            break

        // QUIT COMMAND
        case 'quit':
            if (player) {
                if (players[guild.id]) {
                    players[guild.id].destroy()
                }
                else {
                    player.vc.leave()
                }
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
                    Logger.error('' + err + '\n' + err.stack)
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