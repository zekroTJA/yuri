# Yuri WebAPIClient

## Server Side

First of all, you need to set a request token in the bots `config.json` like in the following example:
```json
{
   "wstoken": "RjmdFcLG62LKXTjDJSgAgYqxX7Nvq7xGJ3LekqtGZD7gDn43GTTa2T7t2uhBF9RG",
}
```
A nice site to generate such tokens is [passwordsgenerator.net](http://passwordsgenerator.net/).

Then, if you host your bot on an private home server *(for example a Raspberry Pi or somethign like that)*, you need to forward the port **`6612`** *(or whatever else port if you had changed it in the websocket.js class)* in your router / gateway.

If everything went successfull, you will see that the websocket is starting right before the Discord client is loggs in:

![](http://zekro.de/ss/ConEmu64_2018-06-24_02-22-52.png)

---

## Client Side

Just [download](https://github.com/zekroTJA/yuri/releases) the lastest version of the tool and save it somewhere on your PC or compile it by yourself. You'll need Visual Stuido 2015+ for this.

Also, don't forget to place the `Newtonsoft.Json.dll` right next to the file.

Then, just start the tool, log in with the websocket URL *(defaultly something like `http://yourserversIP:6612`)*, your token you've set in the `config.json` and your Discord ClientID *(just enter `<prefix>myid` in the chat and the bot will give you your ID)*. You need to be in a voice channel on any guild the bot is connected to that the bot can fetch the guild and create a player if needed.

![](http://zekro.de/ss/YuriClient_2018-06-25_13-33-56.png)

Then, just define some key combinations with some sounds.

![](http://zekro.de/ss/YuriClient_2018-06-25_13-48-09.png)

**Attention:**  
These are global hotkeys! That means, that they *could* overwrite some hot keys of games or programs, so chose them carefully!

---

# API Endpoints

If you want to create your own client app, here are all endpoints of the socket. Arguments needs to be passed as URL parameters.

The APIs anwer will always look like following:

**On success:**  
```json
{
  "status": "OK",
  "code": 0,
  "desc": "OK"
}
```

**On error:**  
```json
{
  "status": "ERROR",
  "code": <1-7>,
  "desc": "<error message>"
}
```

[Here](https://github.com/zekroTJA/yuri/blob/master/src/core/websocket.js#L15-L24) you can see all error codes.

### /login

> /login?token=`<token>`&user=`<userID>`

Logging in the user and create a session for this user.

| argument | description |
|----------|-------------|
| token    | The token string set in the config.json |
| user     | The Discord user ID of the client |


### /logout

> /login?token=`<token>`&user=`<userID>`

Log out the user and destroy the session.

| argument | description |
|----------|-------------|
| token    | The token string set in the config.json |
| user     | The Discord user ID of the client |


### /play

> /play?token=`<token>`&user=`<userID>`&file=`<soundFile>`

Play a sound in the users channel. If the bot is not connected to the users channel, it will create a player instance and join into the voice channel of the user.

| argument | description |
|----------|-------------|
| token    | The token string set in the config.json |
| user     | The Discord user ID of your client |
| file     | The sound files name to play *(without file extension)* |

### /sounds

> /sounds?token=`<token>`

Get a list of all sound files.

| argument | description |
|----------|-------------|
| token    | The token string set in the config.json |

**Output:**
```json
{
  "status": "OK",
  "code": 0,
  "desc": {
    "n": <number of files>,
    "sounds": [
      "file1",
      "file2"
     ]
  }
}
```

### /guilds

> /guilds?token=`<token>`

Get a list of all guidls the bot is connected to.

| argument | description |
|----------|-------------|
| token    | The token string set in the config.json |

**Output:**
```json
{
  "status": "OK",
  "code": 0,
  "desc": {
    "n": <number of guilds>,
    "guilds": [
      [
         "<guild name>",
         "<guild id>
      ]
     ]
  }
}
```

### /token

> /token?token=`<token>`

Check if the token is valid.

| argument | description |
|----------|-------------|
| token    | The token string set in the config.json |

---

© 2018 Ringo Hoffmann (zekro Development)  
contact[at]zekro.de | zekro.de
