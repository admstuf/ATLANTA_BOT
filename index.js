require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Collection, PermissionsBitField, EmbedBuilder, Events } = require('discord.js');
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
let firebaseConfig = {};
// Removed duplicate 'let appId = 'default-app-id';'
let appId = 'default-app-id'; // Default value for appId

if (process.env.FIREBASE_CONFIG) {
    try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
        appId = firebaseConfig.appId || 'default-app-id'; // Extract appId from the parsed config
        console.log('Firebase configuration loaded from FIREBASE_CONFIG environment variable.');
    } catch (e) {
        console.error('ERROR: Could not parse FIREBASE_CONFIG environment variable. It must be a valid JSON string.', e);
        // Fallback to empty config if parsing fails, which will lead to Firebase init error
        firebaseConfig = {};
    }
} else {
    console.warn('WARNING: FIREBASE_CONFIG environment variable not found. Firebase will attempt to initialize with an empty config, likely failing.');
}

// Add a default projectId if it's missing, to prevent Firebase initialization errors
// Also warn if apiKey is missing, as it's critical for auth/firestore
if (!firebaseConfig.projectId) {
    // Removed duplicate console.warn
    console.warn('WARNING: "projectId" not found in firebaseConfig. Using "default-project" for initialization. Please ensure FIREBASE_CONFIG contains a valid projectId.');
    firebaseConfig.projectId = 'default-project'; // Provide a fallback projectId
}
if (!firebaseConfig.apiKey) {
    // Removed duplicate console.error
    console.error('CRITICAL ERROR: "apiKey" not found in firebaseConfig. Firebase authentication and Firestore operations will fail. Please ensure FIREBASE_CONFIG contains a valid apiKey.');
}


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
            // Note: __initial_auth_token is a Canvas-specific variable. If not in Canvas, it will be undefined.
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
    // Removed duplicate 'const filePath = path.join(commandsPath, file);'
    const filePath = path.join(commandsPath, file); // Corrected 'commands' to 'commandsPath'
    const command = require(filePath);

    // Load as prefix command if it has 'name' and 'execute' and is NOT a slash command
    if ('name' in command && 'execute' in command && !command.data) {
        client.commands.set(command.name, command);
        console.log(`Loaded prefix command: ${command.name}`);
    }
    // Load as slash command if it has 'data' and 'execute'
    else if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command); // Use data.name for slash commands
        slashCommands.push(command.data.toJSON());
        console.log(`Loaded slash command: ${command.data.name}`);
    } else {
        console.warn(`[WARNING] The command at ${filePath} is missing a required "name"/"data" or "execute" property.`);
    }
}


client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // ⭐⭐⭐ REGISTER SLASH COMMANDS ⭐⭐⭐
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
    try {
        console.log(`Started refreshing ${slashCommands.length} application (/) commands.`);
        // Registering commands globally (can can take up to an hour to propagate)
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
    if (!command || !command.execute) return; // If command not found or no execute method, do nothing

    try {
        await command.execute(message, args); // Execute the command
    } catch (error) {
        console.error(`Error executing prefix command ${commandName}:`, error); // Log any errors during command execution
        message.reply('There was an error executing that command.');
    }
});

// ⭐⭐⭐ CENTRALIZED INTERACTION COMMAND HANDLER (FOR SLASH COMMANDS, BUTTONS, MODALS) ⭐⭐⭐
client.on(Events.InteractionCreate, async interaction => {
    // Pass client object to interaction handlers for database access etc.
    interaction.client = client;

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No slash command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing slash command ${interaction.commandName}:`, error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', flags: 64 }).catch(err => console.error('Failed to followUp to interaction:', err));
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 }).catch(err => console.error('Failed to reply to interaction:', err));
            }
        }
    } else if (interaction.isButton()) {
        // Handle button interactions
        const commandName = interaction.message.interaction?.commandName || interaction.customId.split('_')[0]; // Try to get original slash command or first part of customId
        const command = client.commands.get(commandName);

        if (command && typeof command.handleButtonInteraction === 'function') {
            try {
                await command.handleButtonInteraction(interaction);
            } catch (error) {
                console.error(`Error handling button interaction for customId ${interaction.customId}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error processing this button action!', flags: 64 }).catch(err => console.error('Failed to followUp button interaction:', err));
                } else {
                    await interaction.reply({ content: 'There was an error processing this button action!', flags: 64 }).catch(err => console.error('Failed to reply button interaction:', err));
                }
            }
        } else {
            console.warn(`No specific button handler found for customId: ${interaction.customId}`);
            // Fallback for unhandled buttons to prevent "interaction failed"
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferUpdate().catch(err => console.error('Failed to deferUpdate for unhandled button:', err));
            }
        }
    } else if (interaction.isModalSubmit()) {
        // Handle modal submissions
        const commandName = interaction.customId.split('_')[0]; // Get the base command name from the modal customId
        const command = client.commands.get(commandName);

        if (command && typeof command.handleModalSubmit === 'function') {
            try {
                await command.handleModalSubmit(interaction);
            }
            catch (error) { // This catch is now correctly placed
                console.error(`Error handling modal submission for customId ${interaction.customId}:`, error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error processing your submission!', flags: 64 }).catch(err => console.error('Failed to followUp modal submission:', err));
                } else {
                    await interaction.reply({ content: 'There was an error processing your submission!', flags: 64 }).catch(err => console.error('Failed to reply modal submission:', err));
                }
            }
        } else {
            console.warn(`No specific modal handler found for customId: ${interaction.customId}`);
            // Fallback for unhandled modals to prevent "interaction failed"
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: 'An unexpected error occurred with your submission. Please try again.', flags: 64 }).catch(err => console.error('Failed to reply for unhandled modal:', err));
            }
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
        const waveEmoji = '<a:wave_animated:1391882992955297962>'; // Corrected animated wave emoji ID
        const welcomeMessage = `> ${waveEmoji} **Welcome ${member.toString()} to Atlanta Roleplay! You are our \`${memberCount}\` member!**`;

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

client.login(process.env.DISCORD_BOT_TOKEN); // Ensure DISCORD_BOT_TOKEN is set in your .env file











