const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'partner',
  description: 'Announce a partnership.',
  async execute(message, args) {
    const allowedRoleId = '1390759183376453764'; // NEW Trainee Discord Moderator role ID

    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const representative = args[0];
    const inviteLink = args[1];
    const partnershipMessage = args.slice(2).join(' ');

    if (!representative || !inviteLink || !partnershipMessage) {
      const reply = await message.reply('**Usage:** `!partner [representative] [invite link] [message]`');
      return setTimeout(() => reply.delete().catch(() => {}), 10000);
    }

    const embed = new EmbedBuilder()
      .setTitle('🤝 New Partnership!')
      .setDescription(`${partnershipMessage}\n\n**Representative:** ${representative}\n**Invite:** ${inviteLink}`)
      .setColor('#2ecc71')
      .setThumbnail('https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024')
      .setFooter({ text: 'Atlanta Roleplay Partnership Announcement' })
      .setTimestamp();

    const partnerButton = new ButtonBuilder()
      .setLabel('Atlanta Roleplay Affiliates')
      .setStyle(ButtonStyle.Link)
      .setURL(inviteLink);

    const row = new ActionRowBuilder().addComponents(partnerButton);

    try {
      await message.channel.send({ embeds: [embed], components: [row] });
      const confirmation = await message.reply('✅ Partnership announcement posted!');
      setTimeout(() => confirmation.delete().catch(() => {}), 8000);
    } catch (error) {
      console.error('Partner command error:', error);
      const errorReply = await message.reply(⚠️ **Error:** Failed to post partnership announcement.');
      setTimeout(() => errorReply.delete().catch(() => {}), 10000);
    }
  },
};



