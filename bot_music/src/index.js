const { Client, Events, GatewayIntentBits, ChannelType, Collection, GuildMember } = require('discord.js');
const { joinVoiceChannel, AudioPlayerStatus, AudioResource, entersState, VoiceConnectionStatus, VoiceConnection, VoiceConnectionDisconnectReason } = require('@discordjs/voice');
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

const subscriptions = new Collection()

client.on(Events.MessageCreate, async (message) => {

  interact_with_command({ message, client, prefix, ChannelType, subscriptions })

});



client.once(Events.ClientReady, () => {
  console.log('🎵 Bot Music is ready!')
});
