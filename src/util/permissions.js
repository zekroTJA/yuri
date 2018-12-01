const Main = require('../main')

module.exports = {

    // PERMISSIONS

    PLAY_SOUND:       1,
    CREATE_API_TOKEN: 2,
    RESTART_BOT:      4,
    UPLOAD_FILES:     8,

    DEFAULT_PERMS: 1 | 2,

    setPerm(user, perm) {
        if (user.id)
            user = user.id;
        Main.database.run(
            'INSERT OR IGNORE INTO users (id, createdAt, lastAccess, permcode) VALUES (?, ?, ?, ?);',
            [ user, Date.now(), Date.now(), perm ],
            () => {
                Main.database.run('UPDATE users SET permcode = ? WHERE id = ?;', [perm, user])
            }
        );
    },

    addPerm(user, perm) {
        if (user.id)
        user = user.id;
        Main.database.run(
            'INSERT OR IGNORE INTO users (id, createdAt, lastAccess, permcode) VALUES (?, ?, ?, ?);',
            [ user, Date.now(), Date.now(), perm ],
            () => {
                Main.database.run('UPDATE users SET permcode = permcode | ? WHERE id = ?;', [perm, user])
            }
        );
    },

    removePerm(user, perm) {
        if (user.id)
        user = user.id;
        Main.database.run(
            'INSERT OR IGNORE INTO users (id, createdAt, lastAccess, permcode) VALUES (?, ?, ?, ?);',
            [ user, Date.now(), Date.now(), 0 ],
            () => {
                Main.database.run('UPDATE users SET permcode = (~(permcode & ?)) & (permcode | ?) WHERE id = ?;', [perm, perm, user])
            }
        );
    },


    hasPerm(user, perm, cb) {
        if (user.id)
            user = user.id;
        Main.database.get('SELECT permcode FROM users WHERE id = ? AND permcode & ?;', [user, perm], (err, row) => {
            cb(!err && row)
        })
    },

    getPerm(user, cb) {
        if (user.id)
            user = user.id;
        Main.database.get('SELECT permcode FROM users WHERE id = ?;', [user], (err, row) => {
            cb(row)
        })
    },

};