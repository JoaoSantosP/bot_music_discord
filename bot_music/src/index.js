const { Client, Events, GatewayIntentBits, ChannelType, Collection } = require('discord.js');
const { read_commands, commands } = require('./utils/read_commands');
const { interact_with_command } = require('./utils/interact_with_command')
const dotenv = require('dotenv').config();
const token = process.env.TOKEN;
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] })

const prefix = '!'

client.login(token);

read_commands(client.commands)
client.commands = commands;
client.aliases = new Collection();


client.on(Events.MessageCreate, async (message) => {
  interact_with_command({ message, client, prefix, ChannelType })
});

client.once(Events.ClientReady, () => {
  console.log('🎵 Bot Music is ready!')
});










/* if (message.content.toLowerCase().startsWith('!')) {
   setTimeout(() => {
     message.reply('oi')
   }, 3000)
 } */