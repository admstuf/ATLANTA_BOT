const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const moment = require('moment'); // Assuming moment is still used for transcript if needed, though modal doesn't use it directly

module.exports = {
    name: 'appeal', // The command name will be !appeal
    description: 'Starts a ban appeal process via a modal.',
    async execute(message) {
        const staffRoleId = '1379809709871071352'; // The specific role ID that can run this command

        // Check if the user has the required staff role to run this command
        if (!message.member.roles.cache.has(staffRoleId)) {
            return message.reply({ content: '❌ You do not have permission to use this command. Only staff can initiate the appeal panel.', ephemeral: true });
        }

        // Create the embed for the appeal panel
        const embed = new EmbedBuilder()
            .setTitle('Ban Appeal')
            .setDescription('If you wish to submit a ban appeal, please press the **Start Appeal** button below.\n\nYou will be asked to answer some questions. Make sure you were banned at least 3 days ago, otherwise your appeal will be declined.')
            .setColor('#B22222');

        const button = new ButtonBuilder()
            .setCustomId('start_appeal_modal') // Unique customId for this button to open the modal
            .setLabel('Start Appeal')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        try {
            // Send the initial message with the button to the channel, making it visible to everyone.
            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Failed to send appeal panel:', error);
            await message.reply({ content: '❌ Failed to post the appeal panel. Please try again later.', ephemeral: true });
        }
    },

    async setup(client) {
        client.on(Events.InteractionCreate, async interaction => {
            // Handle button interactions
            if (interaction.isButton()) {
                // Check if the clicked button is the "Start Appeal" button for the modal
                if (interaction.customId === 'start_appeal_modal') {
                    // Create the modal for appeal submission
                    const modal = new ModalBuilder()
                        .setCustomId('appeal_submission_modal') // Unique customId for this appeal modal
                        .setTitle('Ban Appeal Form');

                    // Create text input components for each question
                    const robloxUsernameInput = new TextInputBuilder()
                        .setCustomId('robloxUsernameInput')
                        .setLabel('What is your Roblox username?')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true);

                    const banReasonInput = new TextInputBuilder()
                        .setCustomId('banReasonInput')
                        .setLabel('Why were you banned? (Please provide details with 2+ sentences)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMinLength(20) // Enforce minimum length for detail
                        .setRequired(true);

                    const unbanReasonInput = new TextInputBuilder()
                        .setCustomId('unbanReasonInput')
                        .setLabel('Why should you be unbanned? (At least 5 sentences)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMinLength(50) // Enforce minimum length for detail
                        .setRequired(true);

                    // Add inputs to action rows (each text input must be in its own ActionRow)
                    const firstActionRow = new ActionRowBuilder().addComponents(robloxUsernameInput);
                    const secondActionRow = new ActionRowBuilder().addComponents(banReasonInput);
                    const thirdActionRow = new ActionRowBuilder().addComponents(unbanReasonInput);

                    // Add action rows to the modal
                    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

                    console.log(`[APPEAL] Attempting to show modal for user ${interaction.user.tag} (${interaction.user.id}).`);
                    try {
                        await interaction.showModal(modal);
                    } catch (error) {
                        console.error(`[APPEAL ERROR] Failed to show appeal modal for ${interaction.user.tag}:`, error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: '❌ Failed to open the appeal form. Please try again later.', ephemeral: true });
                        } else {
                            await interaction.followUp({ content: '❌ Failed to open the appeal form. Please try again later.', ephemeral: true });
                        }
                    }
                }

                // ACCEPT/DECLINE BUTTONS (for staff in the mod log channel)
                if (interaction.customId.startsWith('accept_appeal_') || interaction.customId.startsWith('decline_appeal_')) {
                    const userId = interaction.customId.split('_').pop(); // Extract user ID from customId
                    const guild = interaction.guild;
                    const appealedUser = await guild.members.fetch(userId).catch(() => null);

                    if (!appealedUser) {
                        return interaction.reply({ content: '❌ Could not find the user associated with this appeal.', ephemeral: true });
                    }

                    const action = interaction.customId.startsWith('accept') ? 'accepted' : 'decline'; // Corrected 'declined' to 'decline' for consistency
                    const color = action === 'accepted' ? '#00ff00' : '#ff0000';

                    const decisionEmbed = new EmbedBuilder()
                        .setTitle(`Ban Appeal ${action === 'accepted' ? 'Accepted' : 'Declined'}`)
                        .setDescription(`Your ban appeal has been **${action}d** by our HR team.`) // Added 'd' for grammar
                        .setColor(color)
                        .setTimestamp();

                    await appealedUser.send({ embeds: [decisionEmbed] }).catch(() => {
                        console.error(`Failed to send appeal decision DM to ${appealedUser.user.tag}.`);
                    });

                    await interaction.update({
                        embeds: [
                            new EmbedBuilder(interaction.message.embeds[0].toJSON())
                                .setColor(color)
                                .setFooter({ text: `Appeal ${action}d by ${interaction.user.tag}` }) // Added 'd' for grammar
                                .setTimestamp()
                        ],
                        components: []
                    });
                    await interaction.followUp({ content: `✅ Appeal ${action}d. User notified (if possible).`, ephemeral: true }); // Added 'd' for grammar
                }
            }

            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                if (interaction.customId === 'appeal_submission_modal') {
                    // Defer the reply immediately to prevent "interaction failed"
                    await interaction.deferReply({ ephemeral: true });

                    const robloxUsername = interaction.fields.getTextInputValue('robloxUsernameInput');
                    const banReason = interaction.fields.getTextInputValue('banReasonInput');
                    const unbanReason = interaction.fields.getTextInputValue('unbanReasonInput');

                    const guild = interaction.guild;
                    const user = interaction.user;

                    const modChannelId = '1390957675311009902';
                    const modChannel = guild.channels.cache.get(modChannelId);

                    if (!modChannel) {
                        console.error(`[APPEAL MODAL ERROR] Mod appeal log channel with ID ${modChannelId} not found.`);
                        await interaction.editReply({ content: '❌ Error: Mod appeal log channel not found. Please contact staff.', ephemeral: true });
                        return;
                    }

                    if (!modChannel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
                        console.error(`[APPEAL MODAL ERROR] Bot does not have permission to send messages in the mod appeal log channel. Please contact staff.`);
                        await interaction.editReply({ content: '❌ Error: Bot does not have permission to send messages in the mod appeal log channel. Please contact staff.', ephemeral: true });
                        return;
                    }

                    const appealEmbed = new EmbedBuilder()
                        .setTitle('New Ban Appeal Submitted (Modal)')
                        .setColor('#B22222')
                        .setDescription(`Ban appeal from <@${user.id}> (${user.tag})`)
                        .addFields(
                            { name: 'Roblox Username', value: robloxUsername || 'No answer' },
                            { name: 'Why were you banned?', value: banReason || 'No answer' },
                            { name: 'Why should you be unbanned?', value: unbanReason || 'No answer' },
                        )
                        .setTimestamp();

                    const acceptButton = new ButtonBuilder()
                        .setCustomId(`accept_appeal_${user.id}`)
                        .setLabel('Accept Appeal')
                        .setStyle(ButtonStyle.Success);

                    const declineButton = new ButtonBuilder()
                        .setCustomId(`decline_appeal_${user.id}`)
                        .setLabel('Decline Appeal')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

                    try {
                        await modChannel.send({ embeds: [appealEmbed], components: [row] });
                        await interaction.editReply({ content: '✅ Your ban appeal has been successfully submitted to the HR team!', ephemeral: true });
                        console.log(`[APPEAL MODAL SUCCESS] Appeal submitted by ${user.tag}.`);
                    } catch (error) {
                        console.error('Failed to send appeal embed to mod channel:', error);
                        await interaction.editReply({ content: '❌ There was an error submitting your appeal. Please try again later.', ephemeral: true });
                    }
                }
            }
        });
    }
};
