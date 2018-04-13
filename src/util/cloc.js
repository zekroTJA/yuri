const exec = require('child_process').exec

exports.cloc = (cb) => {
    exec('cloc ./src --yaml', (error, stdout, stderr) => {
        cb('$ cloc ./src\n' + stdout)
        console.log(error, stdout, stderr)
    })
}