require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');

// Firebase Imports
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, query, where } = require('firebase/firestore');
const { getAuth, signInWithCustomToken, signInAnonymously } = require('firebase/auth');

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
        GatewayIntentBits.GuildMembers, // Essential for guildMemberAdd and guildMemberUpdate events
    ],
});

// Explicitly set the token for the REST manager immediately
// This helps ensure the REST client has the token even before client.login() fully resolves,
// which can prevent "Expected token to be set" errors on early events like guildMemberAdd.
if (process.env.DISCORD_BOT_TOKEN) {
    client.rest.setToken(process.env.DISCORD_BOT_TOKEN);
} else {
    console.error('ERROR: DISCORD_BOT_TOKEN is not set in your .env file! Please ensure it is configured.');
    process.exit(1); // Exit if the token is missing early
}

// ⭐⭐⭐ FIREBASE INITIALIZATION START ⭐⭐⭐
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

let firebaseApp;
let db;
let auth;

try {
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getAuth(firebaseApp);
    console.log('Firebase initialized successfully.');

    // Sign in to Firebase Auth
    (async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined') {
                await signInWithCustomToken(auth, __initial_auth_token);
                console.log('Firebase signed in with custom token.');
            } else {
                await signInAnonymously(auth);
                console.log('Firebase signed in anonymously.');
            }
        } catch (authError) {
            console.error('Firebase Auth Error:', authError);
        }
    })();

} catch (firebaseError) {
    console.error('Failed to initialize Firebase:', firebaseError);
    // Continue running the bot without Firestore if initialization fails, or exit if critical
}

// Make db and auth accessible to commands (e.g., via client object)
client.db = db;
client.auth = auth;
client.appId = appId;
// ⭐⭐⭐ FIREBASE INITIALIZATION END ⭐⭐⭐


// Global error handler for unhandled promise rejections
process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Load commands from commands folder
client.commands = new Collection();
const slashCommands = []; // Array to hold data for slash command registration

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
        console.log(`Loaded prefix command: ${command.name}`);
    } else {
        console.warn(`[WARNING] The prefix command at ${filePath} is missing a required "name" or "execute" property.`);
    }

    // ⭐⭐⭐ Collect Slash Command Data ⭐⭐⭐
    if ('data' in command && typeof command.data.toJSON === 'function') {
        slashCommands.push(command.data.toJSON());
        console.log(`Collected slash command data for: ${command.name}`);
    }

    if ('setup' in command) {
        command.setup(client);
        console.log(`Setup function initialized for command: ${command.name}`);
    }
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // ⭐⭐⭐ REGISTER SLASH COMMANDS ⭐⭐⭐
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        console.log(`Started refreshing ${slashCommands.length} application (/) commands.`);
        // Registering commands globally (can take up to an hour to propagate)
        // For testing, you might want to register per-guild:
        // await rest.put(Routes.applicationGuildCommands(client.user.id, 'YOUR_GUILD_ID'), { body: slashCommands });
        await rest.put(Routes.applicationCommands(client.user.id), { body: slashCommands });
        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('Failed to register slash commands:', error);
    }
});

// Message command handler (for prefix commands like !ticket, !appeal)
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore messages from bots
    const prefix = '!'; // Define your prefix
    if (!message.content.startsWith(prefix)) return; // Ignore messages not starting with '!'

    const args = message.content.slice(prefix.length).trim().split(/ +/);
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

// ⭐⭐⭐ INTERACTION COMMAND HANDLER (FOR SLASH COMMANDS) ⭐⭐⭐
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return; // Only handle slash commands

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        // Pass the interaction object to the command's execute method
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});


// ⭐⭐⭐ AUTO-ROLE AND WELCOME MESSAGE LOGIC ⭐⭐⭐
client.on('guildMemberAdd', async member => {
    const autoRoleId = '1373743096659050536'; // The ID of the role you want to auto-assign on join
    const welcomeChannelId = '1390428167180648488'; // Welcome channel ID

    // --- Auto-Role Logic (on member join) ---
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
        // ⭐ Updated emoji IDs here ⭐
        const waveEmoji = '<a:wave_animated:1391882992955297962>'; // Corrected animated wave emoji ID
        const endEmoji = '<a:arplogo:1390806273619918990>'; // Corrected custom ARPLOGO emoji ID

        const welcomeMessage = `> ${waveEmoji} **Welcome ${member.toString()} to Atlanta Roleplay! We now have \`${memberCount}\` members.** ${endEmoji}`;

        await welcomeChannel.send(welcomeMessage);
        console.log(`[WELCOME MESSAGE SUCCESS] Sent welcome message for ${member.user.tag} to channel "${welcomeChannel.name}".`);

    } catch (error) {
        console.error(`[WELCOME MESSAGE FATAL] Failed to send welcome message for ${member.user.tag} in guild "${member.guild.name}":`, error);
    }
});

// ⭐⭐⭐ ROLE REMOVAL LOGIC (on guildMemberUpdate) ⭐⭐⭐
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const triggerRoleId = '1379847693286772891'; // The role that, when added, triggers the removal
    const roleToRemoveId = '1373743096659050536'; // The role to be removed automatically

    // Check if the new member has the trigger role AND the old member did NOT have it
    const hasTriggerRoleNow = newMember.roles.cache.has(triggerRoleId);
    const didNotHaveTriggerRoleBefore = !oldMember.roles.cache.has(triggerRoleId);

    // Check if the new member still has the role to be removed
    const hasRoleToRemove = newMember.roles.cache.has(roleToRemoveId);

    if (hasTriggerRoleNow && didNotHaveTriggerRoleBefore && hasRoleToRemove) {
        try {
            const roleToRemove = newMember.guild.roles.cache.get(roleToRemoveId);

            if (!roleToRemove) {
                console.error(`[ROLE REMOVAL ERROR] Role to remove with ID ${roleToRemoveId} not found in guild "${newMember.guild.name}".`);
                return;
            }

            // Check bot's permissions and role hierarchy for removal
            if (newMember.guild.members.me.roles.highest.position <= roleToRemove.position) {
                console.error(`[ROLE REMOVAL ERROR] Bot's highest role is not above the role to remove (${roleToRemove.name}) in hierarchy for guild "${newMember.guild.name}".`);
                console.error(`[ROLE REMOVAL INFO] Bot's highest role position: ${newMember.guild.members.me.roles.highest.position}`);
                console.error(`[ROLE REMOVAL INFO] Role to remove position: ${roleToRemove.position}`);
                return;
            }

            if (!newMember.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
                console.error(`[ROLE REMOVAL ERROR] Bot does not have 'Manage Roles' permission to remove roles in guild "${newMember.guild.name}".`);
                return;
            }

            await newMember.roles.remove(roleToRemove);
            console.log(`[ROLE REMOVAL SUCCESS] Removed role "${roleToRemove.name}" from ${newMember.user.tag} in guild "${newMember.guild.name}" because they received role "${newMember.guild.roles.cache.get(triggerRoleId)?.name || triggerRoleId}".`);

        } catch (error) {
            console.error(`[ROLE REMOVAL FATAL] Failed to remove role from ${newMember.user.tag} in guild "${newMember.guild.name}":`, error);
        }
    }
});

// Call the setup method for commands that define it (e.g., your ticket command's interaction listener)
for (const command of client.commands.values()) {
    if (typeof command.setup === 'function') {
        command.setup(client);
        console.log(`Setup function initialized for command: ${command.name}`);
    }
}

client.login(process.env.DISCORD_BOT_TOKEN); // Ensure DISCORD_BOT_TOKEN is set in your .env file
