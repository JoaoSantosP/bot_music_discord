const { VoiceConnection, VoiceConnectionStatus, VoiceConnectionDisconnectReason, joinVoiceChannel, entersState } = require("@discordjs/voice");
const { GuildMember } = require("discord.js");

module.exports = {
  joinChannel: async (data) => {
    const { message, subscriptions, command } = data;
    let { subscription } = data;
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
        }
      }
    }
  }
}