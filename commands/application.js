
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'application',
  description: 'Accept or deny an application.',
  async execute(message, args) {
    // Check for Discord Moderator role
    if (!message.member.roles.cache.some(role => role.name === 'Discord Moderator')) {
      const reply = await message.reply('❌ Only users with the **Discord Moderator** role can use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    // Validate command usage
    if (!args.length || (args[0] !== 'accept' && args[0] !== 'deny')) {
      const reply = await message.reply('❌ **Usage:** `!application accept/deny <@user> <applicationType> <reason>`');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const action = args[0];
    const userMention = args[1];
    const applicationType = args[2];
    const reason = args.slice(3).join(' ') || 'No reason provided';

    // Validate user mention
    const userIdMatch = userMention?.match(/^<@!?(\d+)>$/);
    if (!userIdMatch) {
      const reply = await message.reply('❌ Please mention a valid user who was reviewed.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    // Validate application type
    if (!applicationType) {
      const reply = await message.reply('❌ Please specify the application type (e.g., Staff, Developer, etc.)');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const applicantId = userIdMatch[1];
    const isAccepted = action === 'accept';

    // Create main embed
    const embed = new EmbedBuilder()
      .setColor(isAccepted ? '#00ff00' : '#ff4444')
      .setTitle(isAccepted ? '✅ Application Accepted' : '❌ Application Denied')
      .setDescription(
        `Your **${applicationType}** application has been **${action}ed**!\n\n` +
        `${isAccepted 
          ? "🎉 Congratulations! Your application has been reviewed and accepted by our HR Team.\n" 
          : "Unfortunately, your application did not meet our current requirements.\n"
        }` +
        `Reason: ${reason}`
      )
      .addFields(
        { name: '📋 Type', value: applicationType, inline: true }
      )
      .setFooter({ 
        text: `User ID: ${applicantId} | ${isAccepted ? 'Welcome to the team!' : 'Better luck next time!'}` 
      })
      .setTimestamp();

    // Always send to results channel
    const resultsChannel = message.guild.channels.cache.get('1380691912234897518');
    if (!resultsChannel) {
      const reply = await message.reply('⚠️ **Error:** Could not find the results channel. Please contact an administrator.');
      return setTimeout(() => reply.delete().catch(() => {}), 15000);
    }

    try {
      // Send to results channel
      await resultsChannel.send({
        content: `<@${applicantId}>`,
        embeds: [embed]
      });

      // Send confirmation message that auto-deletes
      const confirmation = await message.reply(
        `${isAccepted ? '✅' : '❌'} **Application ${action}ed!** Results posted in <#1380691912234897518>`
      );
      
      // Auto-delete confirmation after 8 seconds
      setTimeout(() => confirmation.delete().catch(() => {}), 8000);

      // Try to DM the user (optional, won't fail if can't DM)
      try {
        const user = await message.guild.members.fetch(applicantId);
        await user.send({ embeds: [embed] });
      } catch {
        // Silently fail if can't DM - not critical
      }

    } catch (error) {
      console.error('Application command error:', error);
      const errorReply = await message.reply('⚠️ **Error:** Failed to process application. Please try again.');
      setTimeout(() => errorReply.delete().catch(() => {}), 10000);
    }
  },
};
