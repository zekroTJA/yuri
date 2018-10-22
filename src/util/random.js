const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890';

function randomString(len) {
    let maxlen = CHARS.length;
    let result = '';
    for (let i = 0; i < len; i++) {
        result += CHARS[Math.floor(Math.random() * (maxlen - 1))];
    }
    return result;
}

module.exports = {
    randomString
}