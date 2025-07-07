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
        .setDescription('Displays moderator reviews submitted for you.'), // Updated description

    // Execute function for the slash command
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true }); // Defer the reply as fetching data can take time

        const guildId = interaction.guild.id;
        const db = interaction.client.db; // Access Firestore instance from client
        const appId = interaction.client.appId; // Access appId from client

        // Get the display name of the user who ran the command
        // This will be their server nickname if they have one, otherwise their username.
        const currentUserDisplayName = interaction.member.displayName;
        const normalizedCurrentUserDisplayName = normalizeName(currentUserDisplayName); // Normalize for querying

        if (!db) {
            console.error('[MYREVIEWS ERROR] Firestore database not initialized.');
            return interaction.editReply({ content: '❌ The database is not set up correctly. Please contact bot owner.', ephemeral: true });
        }

        try {
            const reviewsCollectionRef = collection(db, `artifacts/${appId}/public/data/moderator_reviews`);
            
            // ⭐⭐⭐ MODIFIED FIRESTORE QUERY WITH NORMALIZED NAME ⭐⭐⭐
            // Filter reviews for the current guild AND where 'normalizedModeratorName' matches the normalized display name of the user
            const q = query(
                reviewsCollectionRef,
                where('guildId', '==', guildId),
                where('normalizedModeratorName', '==', normalizedCurrentUserDisplayName) // Query using the normalized name
            );
            // ⭐⭐⭐ END MODIFIED FIRESTORE QUERY ⭐⭐⭐

            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                return interaction.editReply({ content: `✅ No moderator reviews have been submitted for **${currentUserDisplayName}** yet.`, ephemeral: true }); // Updated message
            }

            const reviewsForUser = [];
            querySnapshot.forEach(doc => {
                reviewsForUser.push(doc.data());
            });

            const reviewEmbed = new EmbedBuilder()
                .setTitle(`📊 Reviews for ${currentUserDisplayName}`) // Updated title to be specific to the user
                .setColor('#B22222')
                .setTimestamp();

            let description = '';
            let totalReviewsCount = reviewsForUser.length;

            if (totalReviewsCount > 0) {
                reviewsForUser.forEach((review, index) => {
                    // Format timestamp for display
                    const date = review.timestamp ? new Date(review.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
                    description += `**Review ${index + 1}:**\n`;
                    description += `> Rating: **${review.rating}/5**\n`;
                    description += `> Reason: ${review.reason}\n`;
                    description += `> Submitted by <@${review.reviewerId}> on ${date}\n\n`;
                });
            } else {
                description = 'No reviews found for you.'; // Fallback, though querySnapshot.empty handles this
            }

            reviewEmbed.setDescription(description.trim()); // Trim any trailing newlines
            reviewEmbed.setFooter({ text: `Total Reviews for ${currentUserDisplayName}: ${totalReviewsCount}` }); // Updated footer

            await interaction.editReply({ embeds: [reviewEmbed], ephemeral: true });

        } catch (error) {
            console.error('[MYREVIEWS FATAL] Failed to fetch or process reviews:', error);
            await interaction.editReply({ content: '❌ An error occurred while fetching your reviews. Please try again later.', ephemeral: true });
        }
    },
};