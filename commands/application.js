const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'application',
  description: 'Accept or deny an application.',
  async execute(message, args) {
    // Check for Discord Moderator role
    if (!message.member.roles.cache.some(role => role.name === 'Discord Moderator')) {
      const reply = await message.reply('Only users with the **Discord Moderator** role can use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    // Validate command usage
    if (!args.length || (args[0] !== 'accept' && args[0] !== 'deny')) {
      const reply = await message.reply('**Usage:** `!application accept/deny <@user> <applicationType> <reason (required for deny)>`');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const action = args[0];
    const userMention = args[1];
    const applicationType = args[2];
    const reason = args.slice(3).join(' ');

    // Validate user mention
    const userIdMatch = userMention?.match(/^<@!?(\d+)>$/);
    if (!userIdMatch) {
      const reply = await message.reply('Please mention a valid user who was reviewed.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    // Validate application type
    if (!applicationType) {
      const reply = await message.reply('Please specify the application type (SWAT, STAFF, or Supervisor)');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    // Check if denial requires reason
    if (action === 'deny' && !reason) {
      const reply = await message.reply('A reason is required when denying an application.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const applicantId = userIdMatch[1];
    const isAccepted = action === 'accept';
    const appType = applicationType.toLowerCase();

    // Determine display name for the application type
    let displayApplicationType;
    if (appType === 'swat') {
      displayApplicationType = 'SWAT';
    } else {
      displayApplicationType = applicationType.charAt(0).toUpperCase() + applicationType.slice(1).toLowerCase();
    }

    // Get specific messages based on application type
    let description;
    let footerText;

    if (appType === 'swat') {
      if (isAccepted) {
        description = 'Your SWAT application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check our departments category for more information.';
        footerText = `User ID: ${applicantId} | Welcome to SWAT!`;
      } else {
        description = `Your SWAT application has been reviewed by our HR team. You unfortunately do not meet the criteria for the SWAT department. You may apply again after 30 days.\n\nReason: ${reason}`;
        footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
      }
    } else if (appType === 'staff') {
      if (isAccepted) {
        description = 'Your staff application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check the Staff Team category for more information.';
        footerText = `User ID: ${applicantId} | Welcome to the staff team!`;
      } else {
        description = `Your staff application has been reviewed by our HR team. You unfortunately do not meet the criteria for our staff team. You may apply again after 30 days.\n\nReason: ${reason}`;
        footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
      }
    } else if (appType === 'supervisor') {
      if (isAccepted) {
        description = 'Your LEO supervisor application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check our departments category for more information.';
        footerText = `User ID: ${applicantId} | Welcome to LEO Supervision!`;
      } else {
        description = `Your LEO supervisor application has been reviewed by our HR team. You unfortunately do not meet the criteria for a LEO Supervisor. You may apply again after 30 days.\n\nReason: ${reason}`;
        footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
      }
    } else {
      const reply = await message.reply('Invalid application type. Please use: SWAT, Staff, or Supervisor');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    // Create main embed
    const embed = new EmbedBuilder()
      .setColor(isAccepted ? '#00ff00' : '#ff4444')
      .setTitle(isAccepted ? 'Application Accepted' : 'Application Denied')
      .setDescription(description)
      .addFields(
        { name: 'Application', value: displayApplicationType, inline: true }
      )
      .setFooter({ 
        text: footerText
      })
      .setThumbnail('https://cdn.discordapp.com/attachments/1387335633550184590/1388647620955607140/Atlanta_Roleplay_BG_1.png') // Updated thumbnail URL
      .setTimestamp();

    // Create disabled reviewer button
    const reviewerButton = new ButtonBuilder()
      .setLabel(`Reviewed by: ${message.author.displayName}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
      .setCustomId('reviewed_by');

    const row = new ActionRowBuilder().addComponents(reviewerButton);

    // Always send to results channel
    const resultsChannel = message.guild.channels.cache.get('1380691912234897518');
    if (!resultsChannel) {
      const reply = await message.reply('⚠️ **Error:** Could not find the results channel. Please contact a bot developer.');
      return setTimeout(() => reply.delete().catch(() => {}), 15000);
    }

    try {
      // Send to results channel
      await resultsChannel.send({
        content: `<@${applicantId}>`,
        embeds: [embed],
        components: [row]
      });

      // Send confirmation message that auto-deletes
      const confirmation = await message.reply(
        `**Application ${action}ed!** Results posted in <#1380691912234897518>`
      );

      // Auto-delete confirmation after 8 seconds
      setTimeout(() => confirmation.delete().catch(() => {}), 8000);

      // Try to DM the user (optional, won't fail if can't DM)
      try {
        const user = await message.guild.members.fetch(applicantId);
        await user.send({ embeds: [embed], components: [row] });
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
