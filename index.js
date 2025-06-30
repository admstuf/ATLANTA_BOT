require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// create express route for health check
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

// start express server
app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// initialize discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// create commands collection
client.commands = new Collection();

// load commands from commands folder
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
    console.log(`Loaded command: ${command.name}`);
  } else {
    console.log(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
  }
}

// event: bot ready
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// event: message create
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  const command = client.commands.get(commandName);
  if (!command) return;

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    message.reply('There was an error executing that command.');
  }
});

// login to discord
client.login(process.env.DISCORD_BOT_TOKEN);