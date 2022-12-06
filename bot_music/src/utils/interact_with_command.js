module.exports = {
  interact_with_command: async (data) => {
    const { message, client, prefix, ChannelType } = data;
    if (message.author.bot) return;
    if (message.channel.type === ChannelType.DM) return;

    if (!message.content.toLowerCase().startsWith(prefix)) return;
    const args = message.content.slice(prefix.length).trim().split(/\s+/);
    let cmd = args.shift().toLowerCase();
    console.log(args)

    if (cmd.length === 0) return;
    let command = client.commands.get(cmd);
    if (!command) command = client.commands.get(client.aliases.get(cmd))

    try {
      await command.play(client, message, args)
    } catch (error) {
      console.error(error)
    }
  }
}