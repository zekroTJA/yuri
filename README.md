<div align="center">
     <img src="http://zekro.de/ss/yurilogo.png" width="200"/>
     <h1>~ Yuri ~</h1>
     <strong>If you believe or not, the best discord soundboard in whole north korea!<br>And it can be controlled with HOTKEYS or over the WEBINTERFACE!</strong><br><br>
     <img src="https://forthebadge.com/images/badges/made-with-javascript.svg" height="30" />&nbsp;
     <img src="https://forthebadge.com/images/badges/uses-html.svg" height="30" />&nbsp;
     <img src="https://forthebadge.com/images/badges/uses-css.svg" height="30" />&nbsp;
     <a href="https://zekro.de/discord"><img src="https://img.shields.io/discord/307084334198816769.svg?logo=discord&style=for-the-badge" height="30"></a>
     <br>
     <br>
     <a href="https://travis-ci.org/zekroTJA/yuri" ><img src="https://travis-ci.org/zekroTJA/yuri.svg?branch=master" /></a>&nbsp;
     <img src="https://img.shields.io/github/package-json/v/zekrotja/yuri.svg" />
</div>

---

Branch | Status
-------|--------
Master | <a href="https://travis-ci.org/zekroTJA/yuri/branches" ><img src="https://travis-ci.org/zekroTJA/yuri.svg?branch=master" /></a>
Dev    | <a href="https://travis-ci.org/zekroTJA/yuri/branches" ><img src="https://travis-ci.org/zekroTJA/yuri.svg?branch=dev" /></a>

---

## Commands

**Command** | **Aliases** | **Description**                                                      
|----|----|----|                                                                                 
| `<sound>` | -/- | Play a sound |                                                                 
| bind `<sound>`/r/reset | -/- | bind a sound or random sounds to the fast key, "reset" to reset | 
| disable | enable | disable or enable the soundboatd [OWNER ONLY] |                             
| help | -/- | Display this help message |                                                       
| info | -/- | Display some info about this bot |                                                
| list `[s]` | ls | List all sounds (add argument "s" for time-sorted list) |                      
| log | logs, history | display guilds sound history |                                           
| quit | -/- | Quit current voice channel |                                                      
| random | r, rand | Play a random sound |                                                       
| search `<query/regexp>` | s | search for sounds by query or regexp |                             
| stop | -/- | Stop currently playing sound (does not quit channel) |                            
| summon | -/- | Summons the bot in the voice channel without playing a sound |

---

## What you need

- Node.JS and npm
- FFMPEG

---

## Setup

1. Create a discord API bot app **[here](http://discordapp.com/developers/applications/me)**


2. You need to install **ffmpeg** on your system. To do this, just follow the steps described in [**this blog post**](https://superuser.com/questions/286675/how-to-install-ffmpeg-on-debian#865744)


3. **[Download](https://github.com/zekroTJA/yuri/archive/master.zip)** this repository or clone it simply with<br>
`$ git clone https://github.com/zekroTJA/yuri.git`


4. Install all **npm dependencies** with the command<br>
`$ npm i`


5. Open the **config.json** file and enter there your discord **bot app token**, your discord **accound id**, the **prefix** you want to control the bot with and the **sound files location** *(absolute or relative)*, where the sound files are the bot should have access to.


6. Now, you can start the bot with<br>
`$ npm start`<br>
or if you want that the bot should run 24/7, then use [**screen**](https://linux.die.net/man/1/screen)<br>
`$ screen -L -S soundboard npm start`


7. Then, take a look in the console and copy the **invite link** and open it in the browser to invite the soundboard bot to your server.<br>
**This is only possible if you have admin permission on the guild!**


8. Place some sound files in the defined location and enter `.help` in discord to see all commands of the soundboard bot! ;)                  
---

## Web Interface

If you set a valid token in the config, you can login to a web interface. This can be accessed on `http://<ipoftheserver>:6612` *or with the port you set to if you changed it.*

Then, join a voice channel on a guild the bot is connecte to and enter your token and your user ID. More information about that you can find in the info field.

![](http://zekro.de/ss/chrome_2018-07-04_17-37-54.png)

After login, you can play sounds by clicking the tiles, search for sounds or manage the bot.

![](http://zekro.de/ss/chrome_2018-07-04_17-39-54.png)

---

## Hotkey Client

**[Here](https://github.com/zekroTJA/yuri/blob/master/WebApiClient/README.md)** you will find more information about setting up the websocket and getting the hotkey client.

---

## Used 3rd party dependencies

- [body-parser](https://www.npmjs.com/package/body-parser)
- [colors](https://www.npmjs.com/package/colors)
- [discord.js](https://www.npmjs.com/package/discord.js)
- [express](https://www.npmjs.com/package/express)
- [express-handlebars](https://www.npmjs.com/package/express-handlebars)
- [node-opus](https://www.npmjs.com/package/node-opus)
- [socket.io](https://www.npmjs.com/package/socket.io)
