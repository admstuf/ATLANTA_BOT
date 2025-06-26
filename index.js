require('dotenv').config();
const fs = require('fs');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');

// create the client with required intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// collection for commands
client.commands = new Collection();

// dynamically load commands
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// on bot ready
client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

// on message
client.on('messageCreate', async (message) => {
  if (!message.content.startsWith('!') || message.author.bot) return;

  const args = message.content.slice(1).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();
  const command = client.commands.get(commandName);

  if (!command) return;

  // only allow Discord Moderator role for everything except !commands
  if (commandName !== 'commands' && !message.member.roles.cache.some(r => r.name === 'Discord Moderator')) {
    return message.reply('❌ Only users with the **Discord Moderator** role can use this command.');
  }

  try {
    await command.execute(message, args);
  } catch (error) {
    console.error(error);
    await message.reply('⚠️ There was an error trying to execute that command.');
  }
});

// minimal express web server for Replit uptime
const express = require('express');
const app = express();
app.get('/', (req, res) => res.send('Bot is alive!'));
app.listen(3000, () => console.log('🌐 Web server running to keep bot alive on Replit.'));

// login
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN is not set in environment variables!');
  process.exit(1);
}
client.login(token);