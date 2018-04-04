const { client, config } = require('../main')
const Logger = require('./logger')
const { info, error } = require('./msgs')
const { RichEmbed } = require('discord.js')


var listMsgs = {}


const MAX_PAGE_SIZE = 40


class SoundsList {

    constructor(files, senderMsg, page) {
        return new Promise((resolve, reject) => {
            this.files = files
            this.senderMsg = senderMsg
            this.currPage = page ? page : 0
            this.pages = Math.floor(this.files.length / MAX_PAGE_SIZE) + 1
    
            this.senderMsg.channel.send('', this.parse())
                .then(m => {
                    m.react("\👈")
                    setTimeout(() => m.react("\👉"), 100)
                    this.msg = m
                    listMsgs[this.senderMsg.member.guild.id] = this
                    resolve(this)
                })
                .catch(err => {
                    error(this.senderMsg.channel, 'An error occured creating list message.')
                    Logger.error('An error occured creating list message:\n' + err)
                    reject(err)
                })
        })
    }

    parse() {
        return new RichEmbed() 
            .setTitle(`:scroll:  ${this.files.length} FILES (${this.currPage + 1} / ${this.pages})`)
            .setColor(0x03A9F4)
            .setDescription(
                this.files
                    .slice(this.currPage * MAX_PAGE_SIZE, this.currPage * MAX_PAGE_SIZE + MAX_PAGE_SIZE)
                    .map(f => config.prefix + f.split('.')[0])
                    .join('\n')
            )
    }

    swap(forward) {
        let d = forward ? 1 : -1
        if (this.currPage == 0 && !forward)
            this.currPage = this.pages - 1
        else if (this.currPage == this.pages - 1 && forward)
            this.currPage = 0
        else
            this.currPage += d
        this.msg.edit('', this.parse())
    }

}


module.exports = {
    listMsgs,
    SoundsList
}