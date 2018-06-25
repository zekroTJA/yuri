<div align="center">
     <img src="http://zekro.de/ss/yurilogo.png" width="200"/>
     <h1>~ Yuri ~</h1>
     <strong>If you believe or not, the best discord soundboard in whole north korea!<br>And it can be controlled with HOTKEYS!</strong><br><br>
     <a href="" ><img src="https://img.shields.io/github/commit-activity/y/zekroTJA/yuri.svg" /></a>&nbsp;
     <a href="" ><img src="https://img.shields.io/github/languages/top/zekroTJA/yuri.svg" /></a>&nbsp;
     <a href="https://travis-ci.org/zekroTJA/yuri" ><img src="https://travis-ci.org/zekroTJA/yuri.svg?branch=master" /></a>&nbsp;
</div>

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

## Current plans

- [x] playing stats + command to display
- [ ] rename command
- [ ] lockchan command to lock bot on only one voice channel perm guild
- [ ] general simple settings system
- [ ] blacklist
- [ ] volume settings
- [ ] prank command

---

## Used 3rd party dependencies

- [discord.js](https://github.com/hydrabolt/discord.js)
- [node-opus](https://github.com/Rantanen/node-opus)
- [colors](https://github.com/Marak/colors.js)
