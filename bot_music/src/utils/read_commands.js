const path = require('path');
const fs = require('fs');
const { Collection } = require('discord.js');
const commandsPath = path.join(__dirname, '..', 'commands',);
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
const commands = new Collection();

const read_commands = () => {
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if ('name' in command && 'play' in command) {
      commands.set(command.name, command);
      // console.log(command)
    } else {
      console.log(`[WARNING] The command at ${filePath} is missing a required "name" or "play" property.`);
    }
  }
}

module.exports = {
  commands,
  read_commands
}