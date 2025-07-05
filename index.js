require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Keep app alive on your host
app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// Set up Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// Global error handler
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Load commands from commands folder
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
  console.error('Commands folder not found. Create a "commands" directory with your command files.');
  process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ('name' in command && 'execute' in command) {
    client.commands.set(command.name, command);
    console.log(`Loaded command: ${command.name}`);
  } else {
    console.warn(`[WARNING] The command at ${filePath} is missing a required "name" or "execute" property.`);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

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

// Call the setup method for commands that define it
for (const command of client.commands.values()) {
  if (typeof command.setup === 'function') {
    command.setup(client);
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);

