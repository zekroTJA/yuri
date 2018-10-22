const Colors = require('colors')
const Main = require('../main')


/**
 * Display error formated console output.
 * @param {string} content
 */
exports.error = (content) => {
    if (!content) 
        return
    content.toString().split('\n').forEach(s => {
        console.log(`${'[ERROR]'.red} ${s}`)
    })
}

/**
 * Display warning formated console output.
 * @param {string} content
 */
exports.warning = (content) => {
    if (!content) 
        return
    content.toString().split('\n').forEach(s => {
        console.log(`${'[WARNING]'.magenta} ${s}`)
    })
}

/**
 * Display info formated console output.
 * @param {string} content
 */
exports.info = (content) => {
    if (!content) 
        return
    content.toString().split('\n').forEach(s => {
        console.log(`${'[INFO]'.cyan} ${s}`)
    })
}

/**
 * Display debug formated console output, if
 * program was started with debug arument
 * "-d" or "--debug".
 * Else function call will be ignored.
 * @param {string} content
 */
exports.debug = (content) => {
    if (!content) 
        return
    if (process.argv.indexOf('-d') > -1 || process.argv.indexOf('--debug') > - 1 || process.argv.indexOf('--test')) {
        content.toString().split('\n').forEach(s => {
            console.log(`${'[DEBUG]'.yellow} ${s}`)
        })
    }    
}