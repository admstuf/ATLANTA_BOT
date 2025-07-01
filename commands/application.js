const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'application',
  description: 'Accept or deny an application.',
  async execute(message, args) {
    if (!message.member.roles.cache.some(role => role.name === 'Discord Moderator')) {
      const reply = await message.reply('Only users with the **Discord Moderator** role can use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    if (!args.length || (args[0] !== 'accept' && args[0] !== 'deny')) {
      const reply = await message.reply('**Usage:** `!application accept/deny <@user> <applicationType> <reason (required for deny)>`');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const action = args[0];
    const userMention = args[1];
    const applicationType = args[2];
    const reason = args.slice(3).join(' ');

    const userIdMatch = userMention?.match(/^<@!?(\d+)>$/);
    if (!userIdMatch) {
      const reply = await message.reply('Please mention a valid user who was reviewed.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    if (!applicationType) {
      const reply = await message.reply('Please specify the application type (swat, staff, supervisor, or media)');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    if (action === 'deny' && !reason) {
      const reply = await message.reply('A reason is required when denying an application.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const applicantId = userIdMatch[1];
    const isAccepted = action === 'accept';
    const appType = applicationType.toLowerCase();

    let description, footerText, imageUrl;

    if (appType === 'swat') {
      imageUrl = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448470221295697/SWAT_TEAM_APPLICATION.png';
      if (isAccepted) {
        description = 'Your swat application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check our departments category for more information.';
        footerText = `User ID: ${applicantId} | Welcome to swat!`;
      } else {
        description = `Your swat application has been reviewed by our HR team. You unfortunately do not meet the criteria for the swat department. You may apply again after 30 days.\n\nReason: ${reason}`;
        footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
      }
    } else if (appType === 'staff') {
      imageUrl = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448469499875378/STAFF_TEAM_APPLICATION.png';
      if (isAccepted) {
        description = 'Your staff application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check the staff team category for more information.';
        footerText = `User ID: ${applicantId} | Welcome to the staff team!`;
      } else {
        description = `Your staff application has been reviewed by our HR team. You unfortunately do not meet the criteria for our staff team. You may apply again after 30 days.\n\nReason: ${reason}`;
        footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
      }
    } else if (appType === 'supervisor') {
      imageUrl = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448469856387112/SUPERVISOR_APPLICATION.png';
      if (isAccepted) {
        description = 'Your supervisor application has been reviewed by our HR team. We are pleased to inform you that you were accepted! Please check our departments category for more information.';
        footerText = `User ID: ${applicantId} | Welcome to supervision!`;
      } else {
        description = `Your supervisor application has been reviewed by our HR team. You unfortunately do not meet the criteria for a supervisor. You may apply again after 30 days.\n\nReason: ${reason}`;
        footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
      }
    } else if (appType === 'media') {
      imageUrl = 'https://cdn.discordapp.com/attachments/1385162246707220551/1389448469105606739/MEDIA_TEAM_APPLICATION.png';
      if (isAccepted) {
        description = 'Your media team application has been reviewed by our media directing team. We are pleased to inform you that you were accepted! Please check the media team category for more information.';
        footerText = `User ID: ${applicantId} | Welcome to the media team!`;
      } else {
        description = `Your media team application has been reviewed by our media directing team. You unfortunately do not meet the criteria for the media team. You may apply again after 30 days.\n\nReason: ${reason}`;
        footerText = `User ID: ${applicantId} | Please apply after 30 days!`;
      }
    } else {
      const reply = await message.reply('Invalid application type. Please use: swat, staff, supervisor, or media.');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const embed = new EmbedBuilder()
      .setColor(isAccepted ? '#00ff00' : '#ff4444')
      .setTitle(isAccepted ? 'Application Accepted' : 'Application Denied')
      .setDescription(description)
      .addFields({ name: 'Application', value: appType, inline: true })
      .setFooter({ text: footerText })
      .setImage(imageUrl) // sets image at the bottom
      .setTimestamp();

    const reviewerButton = new ButtonBuilder()
      .setLabel(`Reviewed by: ${message.author.displayName}`)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true)
      .setCustomId('reviewed_by');

    const row = new ActionRowBuilder().addComponents(reviewerButton);

    const resultsChannel = message.guild.channels.cache.get('1380691912234897518');
    if (!resultsChannel) {
      const reply = await message.reply('⚠️ **Error:** Could not find the results channel. Please contact a bot developer.');
      return setTimeout(() => reply.delete().catch(() => {}), 15000);
    }

    try {
      await resultsChannel.send({
        content: `<@${applicantId}>`,
        embeds: [embed],
        components: [row],
      });

      const confirmation = await message.reply(`**Application ${action}ed!** Results posted in <#1380691912234897518>`);
      setTimeout(() => confirmation.delete().catch(() => {}), 8000);

      try {
        const user = await message.guild.members.fetch(applicantId);
        await user.send({ embeds: [embed], components: [row] });
      } catch {
        // silently fail if dms closed
      }

    } catch (error) {
      console.error('Application command error:', error);
      const errorReply = await message.reply('⚠️ **Error:** Failed to process application. Please try again.');
      setTimeout(() => errorReply.delete().catch(() => {}), 10000);
    }
  },
};

