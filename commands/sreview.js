const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { collection, addDoc } = require('firebase/firestore'); // Import Firestore functions

// Helper function to normalize names for consistent matching
function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, ''); // Convert to lowercase and remove non-alphanumeric characters
}

module.exports = {
    name: 'sreview', // The command name will be !sreview
    description: 'Starts a moderator review process via a modal.',
    async execute(message) {
        const modRoleId = '1379809709871071352'; // Staff role ID (same as appeal command)

        // Check if the user has the required role to run this command
        if (!message.member.roles.cache.has(modRoleId)) {
            return message.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
        }

        // Send the initial embed with the button to start the review
        const embed = new EmbedBuilder()
            .setTitle('Moderator Review Submission') // Title for the review panel
            .setDescription('If you wish to submit a review for a moderator, please press the **Start Review** button below.\n\nYou will be asked to answer some questions regarding your experience.') // Description for the review panel
            .setColor('#B22222'); // Color of the embed

        const button = new ButtonBuilder()
            .setCustomId('start_mod_review') // Unique customId for this button
            .setLabel('Start Review') // Label on the button
            .setStyle(ButtonStyle.Primary); // Style of the button

        const row = new ActionRowBuilder().addComponents(button);

        try {
            // Send the initial message with the button to the channel, making it visible to everyone.
            await message.channel.send({ embeds: [embed], components: [row] });
        } catch (error) {
            console.error('Failed to send moderator review panel:', error);
            await message.reply({ content: '❌ Failed to post the moderator review panel. Please try again later.', ephemeral: true });
        }
    },

    async setup(client) {
        client.on(Events.InteractionCreate, async interaction => {
            // Handle button interactions
            if (interaction.isButton()) {
                // Check if the clicked button is the "Start Review" button for this command
                if (interaction.customId === 'start_mod_review') {
                    console.log(`[SREVIEW] Attempting to show modal for user ${interaction.user.tag} (${interaction.user.id}).`);
                    // Create the modal for review submission
                    const modal = new ModalBuilder()
                        .setCustomId('mod_review_modal') // Unique customId for this modal
                        .setTitle('Moderator Review Form'); // Title of the modal

                    // Create text input components for each question
                    const moderatorNameInput = new TextInputBuilder()
                        .setCustomId('moderatorNameInput')
                        .setLabel('What moderator are you reviewing?')
                        .setStyle(TextInputStyle.Short) // Short for single-line text
                        .setRequired(true); // This field is required

                    const ratingInput = new TextInputBuilder()
                        .setCustomId('ratingInput')
                        .setLabel('What do you rate this moderator out of 5?')
                        .setStyle(TextInputStyle.Short) // Short for single-line text
                        .setMinLength(1) // Minimum length of 1 character (e.g., '1' or '5')
                        .setMaxLength(1) // Max length of 1 character (e.g., '1' or '5')
                        .setRequired(true); // This field is required

                    const reasonInput = new TextInputBuilder()
                        .setCustomId('reasonInput')
                        .setLabel('Reason:')
                        .setStyle(TextInputStyle.Paragraph) // Paragraph for multi-line text
                        .setMinLength(10) // Minimum length for the reason
                        .setRequired(true); // This field is required

                    // Add inputs to action rows (each text input must be in its own ActionRow)
                    const firstActionRow = new ActionRowBuilder().addComponents(moderatorNameInput);
                    const secondActionRow = new ActionRowBuilder().addComponents(ratingInput);
                    const thirdActionRow = new ActionRowBuilder().addComponents(reasonInput);

                    // Add action rows to the modal
                    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

                    try {
                        await interaction.showModal(modal);
                    } catch (error) {
                        console.error(`[SREVIEW ERROR] Failed to show moderator review modal for ${interaction.user.tag}:`, error);
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({ content: '❌ Failed to open the moderator review form. Please try again later.', ephemeral: true });
                        } else {
                            await interaction.followUp({ content: '❌ Failed to open the moderator review form. Please try again later.', ephemeral: true });
                        }
                    }
                }

                // Handle staff actions (Accept/Decline) on the review submission in the mod log channel
                if (interaction.customId.startsWith('accept_mod_review_') || interaction.customId.startsWith('decline_mod_review_')) {
                    const userId = interaction.customId.split('_').pop();
                    const guild = interaction.guild;
                    const reviewedUser = await guild.members.fetch(userId).catch(() => null);

                    if (!reviewedUser) {
                        return interaction.reply({ content: '❌ Could not find the user associated with this review.', ephemeral: true });
                    }

                    const action = interaction.customId.startsWith('accept') ? 'accepted' : 'decline';
                    const color = action === 'accepted' ? '#00ff00' : '#ff0000';

                    const decisionEmbed = new EmbedBuilder()
                        .setTitle(`Moderator Review ${action === 'accepted' ? 'Accepted' : 'Declined'}`)
                        .setDescription(`Your moderator review has been **${action}d** by our HR team.`)
                        .setColor(color)
                        .setTimestamp();

                    await reviewedUser.send({ embeds: [decisionEmbed] }).catch(() => {
                        console.error(`Failed to send review decision DM to ${reviewedUser.user.tag}.`);
                    });

                    await interaction.update({
                        embeds: [
                            new EmbedBuilder(interaction.message.embeds[0].toJSON())
                                .setColor(color)
                                .setFooter({ text: `Review ${action}d by ${interaction.user.tag}` })
                                .setTimestamp()
                        ],
                        components: []
                    });
                    await interaction.followUp({ content: `✅ Moderator Review ${action}d. User notified (if possible).`, ephemeral: true });
                }
            }

            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                if (interaction.customId === 'mod_review_modal') {
                    // Defer the reply immediately to prevent "interaction failed"
                    await interaction.deferReply({ ephemeral: true });

                    const moderatorName = interaction.fields.getTextInputValue('moderatorNameInput');
                    const rating = interaction.fields.getTextInputValue('ratingInput');
                    const reason = interaction.fields.getTextInputValue('reasonInput');

                    const normalizedModeratorName = normalizeName(moderatorName);

                    const guild = interaction.guild;
                    const user = interaction.user;

                    const modChannelId = '1390957675311009902';
                    const modChannel = guild.channels.cache.get(modChannelId);

                    if (!modChannel) {
                        console.error(`[SREVIEW MODAL ERROR] Moderator review log channel with ID ${modChannelId} not found.`);
                        await interaction.editReply({ content: '❌ Error: Moderator review log channel not found. Please contact staff.', ephemeral: true });
                        return;
                    }

                    if (!modChannel.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
                        console.error(`[SREVIEW MODAL ERROR] Bot does not have permission to send messages in the moderator review log channel. Please contact staff.`);
                        await interaction.editReply({ content: '❌ Error: Bot does not have permission to send messages in the moderator review log channel. Please contact staff.', ephemeral: true });
                        return;
                    }

                    try {
                        console.log(`[SREVIEW MODAL] Attempting to save review to Firestore for ${moderatorName}.`);
                        const reviewsCollectionRef = collection(client.db, `artifacts/${client.appId}/public/data/moderator_reviews`);
                        await addDoc(reviewsCollectionRef, {
                            guildId: guild.id,
                            reviewerId: user.id,
                            moderatorName: moderatorName, // Keep original name for display
                            normalizedModeratorName: normalizedModeratorName, // Save normalized name for querying
                            rating: rating,
                            reason: reason,
                            timestamp: new Date(), // Store current time
                        });
                        console.log(`[FIRESTORE SUCCESS] Moderator review saved for ${moderatorName}.`);
                    } catch (firestoreError) {
                        console.error(`[FIRESTORE ERROR] Failed to save moderator review to Firestore for ${moderatorName}:`, firestoreError);
                        await interaction.editReply({ content: '❌ There was an error saving your review. Please try again later.', ephemeral: true });
                        return;
                    }

                    const reviewEmbed = new EmbedBuilder()
                        .setTitle('New Moderator Review Submitted')
                        .setColor('#B22222')
                        .setDescription(`Review submitted by <@${user.id}> (${user.tag})`)
                        .addFields(
                            { name: 'Moderator Reviewed', value: moderatorName || 'No answer' },
                            { name: 'Rating (out of 5)', value: rating || 'No answer' },
                            { name: 'Reason', value: reason || 'No answer' },
                        )
                        .setTimestamp();

                    const acceptButton = new ButtonBuilder()
                        .setCustomId(`accept_mod_review_${user.id}`)
                        .setLabel('Accept Review')
                        .setStyle(ButtonStyle.Success);

                    const declineButton = new ButtonBuilder()
                        .setCustomId(`decline_mod_review_${user.id}`)
                        .setLabel('Decline Review')
                        .setStyle(ButtonStyle.Danger);

                    const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

                    try {
                        console.log(`[SREVIEW MODAL] Attempting to send review embed to mod channel ${modChannelId}.`);
                        await modChannel.send({ embeds: [reviewEmbed], components: [row] });
                        await interaction.editReply({ content: '✅ Your moderator review has been successfully submitted to the HR team!', ephemeral: true });
                        console.log(`[SREVIEW MODAL SUCCESS] Moderator review submitted by ${user.tag}.`);
                    } catch (error) {
                        console.error(`[SREVIEW MODAL ERROR] Failed to send moderator review embed to mod channel ${modChannelId}:`, error);
                        await interaction.editReply({ content: '❌ There was an error submitting your moderator review. Please try again later.', ephemeral: true });
                    }
                }
            }
        });
    }
};

