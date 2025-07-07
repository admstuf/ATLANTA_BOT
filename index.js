require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder } = require('discord.js'); // Added EmbedBuilder
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Keep app alive on your host (useful for services like Render, Glitch, etc.)
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
        GatewayIntentBits.GuildMembers, // Essential for guildMemberAdd event
    ],
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Load commands from commands folder
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
if (!fs.existsSync(commandsPath)) {
    console.error('Commands folder not found. Create a "commands" directory with your command files.');
    process.exit(1); // Exit if commands folder is missing
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

// Message command handler (for prefix commands like !ticket)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore messages from bots
    if (!message.content.startsWith('!')) return; // Ignore messages not starting with '!'

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase(); // Extract command name and convert to lowercase

    const command = client.commands.get(commandName); // Get the command from the collection
    if (!command) return; // If command not found, do nothing

    try {
        await command.execute(message, args); // Execute the command
    } catch (error) {
        console.error(error); // Log any errors during command execution
        message.reply('There was an error executing that command.'); // Inform the user
    }
});

// ⭐⭐⭐ AUTO-ROLE AND WELCOME MESSAGE LOGIC STARTS HERE ⭐⭐⭐
client.on('guildMemberAdd', async member => {
    const autoRoleId = '1373743096659050536'; // The ID of the role you want to auto-assign
    const welcomeChannelId = '1390428167180648488'; // Updated to the specified welcome channel ID

    // --- Auto-Role Logic ---
    try {
        const role = member.guild.roles.cache.get(autoRoleId);

        if (!role) {
            console.error(`[AUTOROLE ERROR] Role with ID ${autoRoleId} not found in guild "${member.guild.name}".`);
            // Continue to welcome message even if role assignment fails
        } else {
            // Check bot's permissions and role hierarchy
            if (member.guild.members.me.roles.highest.position <= role.position) {
                console.error(`[AUTOROLE ERROR] Bot's highest role is not above the auto-assign role (${role.name}) in hierarchy for guild "${member.guild.name}".`);
                console.error(`[AUTOROLE INFO] Bot's highest role position: ${member.guild.members.me.roles.highest.position}`);
                console.error(`[AUTOROLE INFO] Auto-assign role position: ${role.position}`);
            } else if (!member.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                console.error(`[AUTOROLE ERROR] Bot does not have 'Manage Roles' permission in guild "${member.guild.name}".`);
            } else {
                await member.roles.add(role);
                console.log(`[AUTOROLE SUCCESS] Assigned role "${role.name}" to new member ${member.user.tag} in guild "${member.guild.name}".`);
            }
        }
    } catch (error) {
        console.error(`[AUTOROLE FATAL] Failed to assign role to new member ${member.user.tag} in guild "${member.guild.name}":`, error);
    }

    // --- Welcome Message Logic ---
    try {
        const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);

        if (!welcomeChannel) {
            console.error(`[WELCOME MESSAGE ERROR] Welcome channel with ID ${welcomeChannelId} not found in guild "${member.guild.name}".`);
            return;
        }

        // Check if the bot has permission to send messages in the welcome channel
        if (!welcomeChannel.permissionsFor(member.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
            console.error(`[WELCOME MESSAGE ERROR] Bot does not have 'Send Messages' permission in welcome channel "${welcomeChannel.name}" (${welcomeChannelId}) in guild "${member.guild.name}".`);
            return;
        }

        const memberCount = member.guild.memberCount;
        const waveEmoji = '<a:wave:1263966302289133729>'; // Animated wave emoji URL
        const endEmoji = '<a:atlanta_rp_logo:1390806273619918990>'; // New emoji URL
        // Fallback for wave emoji if the URL doesn't work or is not desired: const waveEmoji = '👋';

        // Changed member.user.tag to member.toString() to ping the user
        // Added backticks for the member count to create a gray box, and the new emoji at the end
        const welcomeMessage = `> ${waveEmoji} **Welcome ${member.toString()} to Atlanta Roleplay! We now have \`${memberCount}\` members.** ${endEmoji}`;

        await welcomeChannel.send(welcomeMessage);
        console.log(`[WELCOME MESSAGE SUCCESS] Sent welcome message for ${member.user.tag} to channel "${welcomeChannel.name}".`);

    } catch (error) {
        console.error(`[WELCOME MESSAGE FATAL] Failed to send welcome message for ${member.user.tag} in guild "${member.guild.name}":`, error);
    }
});
// ⭐⭐⭐ AUTO-ROLE AND WELCOME MESSAGE LOGIC ENDS HERE ⭐⭐⭐

// Call the setup method for commands that define it (e.g., your ticket command's interaction listener)
for (const command of client.commands.values()) {
    if (typeof command.setup === 'function') {
        command.setup(client);
        console.log(`Setup function initialized for command: ${command.name}`);
    }
}

client.login(process.env.DISCORD_BOT_TOKEN); // Ensure DISCORD_BOT_TOKEN is set in your .env file
