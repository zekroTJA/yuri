# Yuri REST API Documentaion

You can connect over the Yuri REST API with `<serverdomain>(:<port>)/api`.

To access the API, you need to generate an API token in the webinterface.
Navigate to your Yuri web interface and log in with your account and the web interface token. Then, klick on the button `▼ ADVANCED` and klick on `API TOKEN MANAGEMENT` in the drop down menu. Then, click on `CREATE TOKEN` and copy the token with `COPY TOKEN TO CLIPBOARD`.

---

## Authorization

If an endpoint is marked with ![](https://img.shields.io/badge/Authorization-required-orange.svg?longCache=true&style=flat-square), you need to pass the generated API token *(not the web interface token of Yuri)* either as `Authorization` header or as data key `token`.

**IMPORTANT:** Endpoints marked with ![](https://img.shields.io/badge/session-required-yellow.svg?longCache=true&style=flat-square) only work if you run `POST /api/login` once before to create a session, which will be set to your token and used for those endpoints.

---

## `POST /api/login`

![](https://img.shields.io/badge/Authorization-required-orange.svg?longCache=true&style=flat-square)

> Create a session instance with your token.

### Arguments

| Argument | Type | Optional | Description |
|----------|------|----------|-------------|
| `token` | `string` | yes *(if using auth header)* | API token to authorize on the API |

### Successful Response

```json
{
  "status": "OK",
  "code": 0,
  "desc": {
    "userid": "221905671296253953",
    "code": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    "guild": {
      "name": "zekro's Super Private Test Envoirement",
      "id": "287535046762561536",
      "ownerid": "221905671296253953"
    },
    "member": {
      "displayName": "???",
      "username": "zekro",
      "tag": "zekro#9131",
      "id": "221905671296253953"
    }
  }
}
```

### Errors

| Code | Error | Description |
|------|-------|-------------|
| `1` | `Invalid token` | The passed API token is invalid, not existent or the base web interface token has changed. |

---

## `POST /api/logout`

![](https://img.shields.io/badge/Authorization-required-orange.svg?longCache=true&style=flat-square)  
![](https://img.shields.io/badge/session-required-yellow.svg?longCache=true&style=flat-square)

> Destroys the current session. You need to log in again to use further API functions.

### Arguments

| Argument | Type | Optional | Description |
|----------|------|----------|-------------|
| `token` | `string` | yes *(if using auth header)* | API token to authorize on the API |

### Successful Response

```json
{
  "status": "OK",
  "code": 0,
  "desc": "OK"
}
```

### Errors

| Code | Error | Description |
|------|-------|-------------|
| `1` | `Invalid token` | The passed API token is invalid, not existent or the base web interface token has changed. |
| `6` | `Session not logged in` | There is no session to the fetched user ID or the session timed out. |

---

## `POST /api/play`

![](https://img.shields.io/badge/Authorization-required-orange.svg?longCache=true&style=flat-square)  
![](https://img.shields.io/badge/session-required-yellow.svg?longCache=true&style=flat-square)

> Destroys the current session. You need to log in again to use further API functions.

### Arguments

| Argument | Type | Optional | Description |
|----------|------|----------|-------------|
| `token` | `string` | yes *(if using auth header)* | API token to authorize on the API |

### Successful Response

```json
{
  "status": "OK",
  "code": 0,
  "desc": "OK"
}
```

### Errors

| Code | Error | Description |
|------|-------|-------------|
| `1` | `Invalid token` | The passed API token is invalid, not existent or the base web interface token has changed. |
| `6` | `Session not logged in` | There is no session to the fetched user ID or the session timed out. |
| `7` | `User not in voice channel` | The tokens user is not in any voice channel so the bot can not join to play a sound. |

---

## `GET /api/sounds`

![](https://img.shields.io/badge/Authorization-required-orange.svg?longCache=true&style=flat-square)

> List all sounds of the bot.

### Arguments

| Argument | Type | Optional | Description |
|----------|------|----------|-------------|
| `token` | `string` | yes *(if using auth header)* | API token to authorize on the API |

### Successful Response

```json
{
  "status": "OK",
  "code": 0,
  "desc": {
    "n": 486,
    "sounds": [
      "sound1",
      "sound2",
      "sound3"
    ]
  }
}
```

### Errors

| Code | Error | Description |
|------|-------|-------------|
| `1` | `Invalid token` | The passed API token is invalid, not existent or the base web interface token has changed. |

---

## `GET /api/guilds`

![](https://img.shields.io/badge/Authorization-required-orange.svg?longCache=true&style=flat-square)  
![](https://img.shields.io/badge/status-DEPRECATED-red.svg?longCache=true&style=flat-square)

> List all guilds ID's and names.

### Arguments

| Argument | Type | Optional | Description |
|----------|------|----------|-------------|
| `token` | `string` | yes *(if using auth header)* | API token to authorize on the API |

### Successful Response

```json
{
  "status": "OK",
  "code": 0,
  "desc": {
    "n": 2,
    "servers": [
      [
        "server1",
        "287535046762561536"
      ],
      [
        "server2",
        "718923718923718923"
      ]
    ]
  }
}
```

### Errors

| Code | Error | Description |
|------|-------|-------------|
| `1` | `Invalid token` | The passed API token is invalid, not existent or the base web interface token has changed. |

---

## `GET /api/token`

![](https://img.shields.io/badge/Authorization-required-orange.svg?longCache=true&style=flat-square)

> Check the validity of your token.

### Arguments

| Argument | Type | Optional | Description |
|----------|------|----------|-------------|
| `token` | `string` | yes *(if using auth header)* | API token to authorize on the API |

### Successful Response

```json
{
  "status": "OK",
  "code": 0,
  "desc": "OK"
}
```

### Errors

| Code | Error | Description |
|------|-------|-------------|
| `1` | `Invalid token` | The passed API token is invalid, not existent or the base web interface token has changed. |

---