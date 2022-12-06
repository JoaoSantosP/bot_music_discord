const Discord = require('discord.js');

module.exports = {
  name: "play",
  aliases: [""],
  play: async (client, message, args) => {
    console.log(client.user.username)
    console.log(message.author.username)
    message.reply('oi')
  }
}