const { VoiceConnection, VoiceConnectionStatus, VoiceConnectionDisconnectReason, joinVoiceChannel, entersState } = require("@discordjs/voice");
const { GuildMember } = require("discord.js");

module.exports = {
  interact_with_command: async (data) => {
    const { message, client, prefix, ChannelType, subscriptions } = data;
    // console.log(client.channels.get())
    let subscription = subscriptions.get(message.guildId)

    if (message.author.bot) return;
    if (message.channel.type === ChannelType.DM) return;

    if (!message.content.toLowerCase().startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    let cmd = args.shift().toLowerCase();
    console.log(cmd, 'cmd')

    if (cmd.length === 0) return;
    let command = client.commands.get(cmd);
    if (!command) command = client.commands.get(client.aliases.get(cmd))
    if (command.name === "play") {
      if (!message.guildId) return;

      if (!subscription) {
        if (message.member instanceof GuildMember && message.member.voice.channel) {
          const channel = message.member.voice.channel;
          // const joinChannel = 
          subscription = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
          });

          subscription.on('stateChange', async (oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
              if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                try {
                  await entersState(subscription, VoiceConnectionStatus.Connecting, 5_000)

                } catch (error) {
                  console.error(error)
                  subscription.Destroy();
                }
              }
            }
          })
          subscriptions.set(message.guildId, subscription);
          setTimeout(() => {
            subscription.destroy()
            subscriptions.delete(message.guildId)
          }, 5000)
          // console.log(subscriptions)
        }
      }
    }

    /* 
        try {
          await command.play(client, message, args)
    
        } catch (error) {
          console.error(error)
        } */
  }
}