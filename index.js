require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, Collection } = require('discord.js');

const app = express();
const PORT = 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Express server running on port ${PORT}`);
});

// commands collection
client.commands = new Collection();

// example command setup (add your commands here)
client.commands.set('ping', {
  name: 'ping',
  description: 'Replies with Pong!',
  execute: async (interaction) => {
    await interaction.reply('Pong!');
  },
});

client.on('ready', () => {
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
    await command.execute(message);
  } catch (error) {
    console.error(error);
    message.reply('There was an error executing that command.');
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
