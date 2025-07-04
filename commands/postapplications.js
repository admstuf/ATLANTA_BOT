const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'postapplications',
  description: 'Post the application embeds with buttons.',
  async execute(message) {
    const allowedRoleId = '1390759296232587325'; // Only users with this role can run the command

    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const logoUrl = 'https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024';

    // === STAFF APPLICATION EMBED ===
    const staffEmbed = new EmbedBuilder()
      .setTitle('🛡️ Staff Application')
      .setColor('#00b0f4')
      .setDescription(
        "**Welcome to Atlanta Roleplay!** You can apply for staff, SWAT team, and become a LEO supervisor! If you wish to apply, use the buttons below to start! No troll applications, AI usage, or copying of any kind, otherwise you will be blacklisted.\n\n" +
        "**Interested in joining our Strict, Professional staff team to moderate good Roleplays? Apply!**\n\n" +
        "**Information:**\n" +
        "• Being dishonest on ANY of these questions will result in an immediate denial of your application\n" +
        "• You must be 13 years or older\n" +
        "• Using AI on any of this application will result in a blacklist from applying\n" +
        "• Have a reasonable standard of Staff knowledge\n" +
        "• Have good grammar, spelling, and punctuation\n" +
        "• Read all server rules before applying."
      )
      .setThumbnail(logoUrl);

    const staffButton = new ButtonBuilder()
      .setLabel('Apply for Staff')
      .setURL('https://forms.gle/3Q6UWYGVWSBqekdX8')
      .setStyle(ButtonStyle.Link);

    const staffRow = new ActionRowBuilder().addComponents(staffButton);

    // === LEO SUPERVISOR EMBED ===
    const supervisorEmbed = new EmbedBuilder()
      .setTitle('🚓 LEO Supervisor Application')
      .setColor('#f4a300')
      .setDescription(
        "**Interested in joining a job that will test how good you are at supervising, and will test your Law Enforcement Officer abilities? LEO Supervisor is what you should apply for!**\n\n" +
        "**Information:**\n" +
        "• Being dishonest on ANY of these questions will result in an immediate denial of your application\n" +
        "• You must be 13 years or older\n" +
        "• Using AI on any of this application will result in a blacklist from applying\n" +
        "• Have a reasonable standard of Law Enforcement Officer knowledge\n" +
        "• Have good grammar, spelling, and punctuation\n" +
        "• Read all server rules before applying."
      )
      .setThumbnail(logoUrl);

    const supervisorButton = new ButtonBuilder()
      .setLabel('Apply for LEO Supervisor')
      .setURL('https://forms.gle/XaY6KdS1KQppcTgf8')
      .setStyle(ButtonStyle.Link);

    const supervisorRow = new ActionRowBuilder().addComponents(supervisorButton);

    // === SWAT APPLICATION EMBED ===
    const swatEmbed = new EmbedBuilder()
      .setTitle('🔫 Atlanta SWAT Application')
      .setColor('#d10000')
      .setDescription(
        "**Interested in joining a very risky, action packed job? Atlanta SWAT is what you should apply for!**\n\n" +
        "**Information:**\n" +
        "• Being dishonest on ANY of these questions will result in an immediate denial of your application\n" +
        "• You must be 13 years or older\n" +
        "• Using AI on any of this application will result in a blacklist from applying\n" +
        "• Have a reasonable standard of SWAT knowledge\n" +
        "• Have good grammar, spelling, and punctuation\n" +
        "• Read all server rules before applying."
      )
      .setThumbnail(logoUrl);

    const swatButton = new ButtonBuilder()
      .setLabel('Apply for SWAT')
      .setURL('https://forms.gle/CQwCboAb5GeMDYA49')
      .setStyle(ButtonStyle.Link);

    const swatRow = new ActionRowBuilder().addComponents(swatButton);

    // === SEND THEM ALL ===
    await message.channel.send({ embeds: [staffEmbed], components: [staffRow] });
    await message.channel.send({ embeds: [supervisorEmbed], components: [supervisorRow] });
    await message.channel.send({ embeds: [swatEmbed], components: [swatRow] });
  },
};
