const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { collection, getDocs, query, where } = require('firebase/firestore'); // Import Firestore functions

// Helper function to normalize names for consistent matching
function normalizeName(name) {
    if (!name) return '';
    return name.toLowerCase().replace(/[^a-z0-9]/g, ''); // Convert to lowercase and remove non-alphanumeric characters
}

module.exports = {
    // Define the slash command data
    data: new SlashCommandBuilder()
        .setName('myreviews')
        .setDescription('Displays moderator reviews for you, or all reviews if you are staff.'),

    // Execute function for the slash command
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Defer the reply as fetching data can take time

        const guildId = interaction.guild.id;
        const db = interaction.client.db; // Access Firestore instance from client
        const appId = interaction.client.appId; // Access appId from client

        const staffRoleId = '1379809709871071352'; // The specific staff role ID

        // Determine if the user running the command is staff
        const isStaff = interaction.member.roles.cache.has(staffRoleId);

        let currentUserDisplayName = '';
        let normalizedCurrentUserDisplayName = '';

        if (!isStaff) {
            // If not staff, get their display name for personalized reviews
            currentUserDisplayName = interaction.member.displayName;
            normalizedCurrentUserDisplayName = normalizeName(currentUserDisplayName);
        }

        if (!db) {
            console.error('[MYREVIEWS ERROR] Firestore database not initialized.');
            return interaction.editReply({ content: '❌ The database is not set up correctly. Please contact bot owner.', ephemeral: true });
        }

        try {
            const reviewsCollectionRef = collection(db, `artifacts/${appId}/public/data/moderator_reviews`);
            let q;

            if (isStaff) {
                // If staff, query for ALL reviews in the current guild
                q = query(reviewsCollectionRef, where('guildId', '==', guildId));
                console.log(`[MYREVIEWS] Staff user ${interaction.user.tag} requested all reviews.`);
            } else {
                // If not staff, query only for reviews matching their normalized display name
                q = query(
                    reviewsCollectionRef,
                    where('guildId', '==', guildId),
                    where('normalizedModeratorName', '==', normalizedCurrentUserDisplayName)
                );
                console.log(`[MYREVIEWS] User ${interaction.user.tag} requested reviews for themselves (${currentUserDisplayName}).`);
            }
            
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                const messageContent = isStaff
                    ? '✅ No moderator reviews have been submitted yet for this server.'
                    : `✅ No moderator reviews have been submitted for **${currentUserDisplayName}** yet.`;
                return interaction.editReply({ content: messageContent, ephemeral: true });
            }

            const reviewsToDisplay = [];
            querySnapshot.forEach(doc => {
                reviewsToDisplay.push(doc.data());
            });

            // Sort reviews by moderator name then by timestamp for consistent display
            reviewsToDisplay.sort((a, b) => {
                const modNameCompare = (a.moderatorName || '').localeCompare(b.moderatorName || '');
                if (modNameCompare !== 0) return modNameCompare;
                const timeA = a.timestamp ? a.timestamp.seconds : 0;
                const timeB = b.timestamp ? b.timestamp.seconds : 0;
                return timeA - timeB;
            });

            const reviewEmbed = new EmbedBuilder()
                .setColor('#B22222')
                .setTimestamp();

            let description = '';
            let totalReviewsCount = reviewsToDisplay.length;

            if (isStaff) {
                reviewEmbed.setTitle('📊 All Moderator Reviews');
                const reviewsByModerator = {};
                reviewsToDisplay.forEach(review => {
                    const modName = review.moderatorName || 'Unknown Moderator';
                    if (!reviewsByModerator[modName]) {
                        reviewsByModerator[modName] = [];
                    }
                    reviewsByModerator[modName].push(review);
                });

                for (const modName in reviewsByModerator) {
                    const reviews = reviewsByModerator[modName];
                    description += `**${modName}** (Total Reviews: ${reviews.length})\n`;
                    reviews.forEach((review, index) => {
                        const date = review.timestamp ? new Date(review.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
                        description += `> Review ${index + 1}: Rating **${review.rating}/5**\n`;
                        description += `> Reason: ${review.reason}\n`;
                        description += `> Submitted by <@${review.reviewerId}> on ${date}\n\n`;
                    });
                    description += '\n';
                }
                reviewEmbed.setFooter({ text: `Overall Total Reviews: ${totalReviewsCount}` });

            } else {
                reviewEmbed.setTitle(`📊 Reviews for ${currentUserDisplayName}`);
                reviewsToDisplay.forEach((review, index) => {
                    const date = review.timestamp ? new Date(review.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
                    description += `**Review ${index + 1}:**\n`;
                    description += `> Rating: **${review.rating}/5**\n`;
                    description += `> Reason: ${review.reason}\n`;
                    description += `> Submitted by <@${review.reviewerId}> on ${date}\n\n`;
                });
                reviewEmbed.setFooter({ text: `Total Reviews for ${currentUserDisplayName}: ${totalReviewsCount}` });
            }

            reviewEmbed.setDescription(description.trim());

            await interaction.editReply({ embeds: [reviewEmbed], ephemeral: true });

        } catch (error) {
            console.error('[MYREVIEWS FATAL] Failed to fetch or process reviews:', error);
            await interaction.editReply({ content: '❌ An error occurred while fetching reviews. Please try again later.', ephemeral: true });
        }
    },
};