const Discord = require('discord.js');

module.exports = {
  name: "play",
  aliases: [""],
  play: async (client, message, args) => {
    let embedError = new Discord.EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🚨  Missing Argument')
      .setDescription(`
      The, query argument is required.

      Usage: !play <song name or url>
      `)

    let embedTest = new Discord.EmbedBuilder()
      .setColor(0x0099FF)
      .setDescription('Testando')

    /* message.reply({ embeds: [embedError] }).then((msg) => {
      setTimeout(() => {
        msg.react('🚨')
      }, 500)
    }) */

    // const msg = message.guild.voiceStates
    // console.log(msg)
    //
  }
}