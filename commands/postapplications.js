const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'postapplication',
  description: 'Posts the application info with buttons for applying.',
  async execute(message, args) {
    const embed = new EmbedBuilder()
      .setColor('#B22222') // changed from blue to dark red like tickets
      .setTitle('Welcome to Atlanta Roleplay!')
      .setThumbnail('https://cdn.discordapp.com/attachments/1385162246707220551/1390213797897179218/IMG_5237-removebg-preview.png')
      .setDescription(
        "**Welcome to Atlanta Roleplay!** You can apply for staff, SWAT team, and become a LEO supervisor! If you wish to apply, use the buttons below to start! No troll applications, AI usage, or copying of any kind, otherwise you will be blacklisted.\n\n" +
        "**Interested in joining our Strict, Professional staff team to moderate good Roleplays? Apply!**\n" +
        "Information:\n" +
        "- Being dishonest on ANY of these questions will result in an immediate denial of your application\n" +
        "- You must be 13 years or older\n" +
        "- Using AI on any of this application will result in a blacklist from applying\n" +
        "- Have a reasonable standard of Staff knowledge\n" +
        "- Have good grammar, spelling, and punctuation\n" +
        "- Read all server rules before applying.\n\n" +

        "**Interested in joining a job that will test how good you are at supervising, and will test your Law Enforcement Officer abilities? LEO Supervisor is what you should apply for!**\n" +
        "Information:\n" +
        "- Being dishonest on ANY of these questions will result in an immediate denial of your application\n" +
        "- You must be 13 years or older\n" +
        "- Using AI on any of this application will result in a blacklist from applying\n" +
        "- Have a reasonable standard of Law Enforcement Officer knowledge\n" +
        "- Have good grammar, spelling, and punctuation\n" +
        "- Read all server rules before applying.\n\n" +

        "**Interested in joining a very risky, action packed job? Atlanta SWAT is what you should apply for!**\n" +
        "Information:\n" +
        "- Being dishonest on ANY of these questions will result in an immediate denial of your application\n" +
        "- You must be 13 years or older\n" +
        "- Using AI on any of this application will result in a blacklist from applying\n" +
        "- Have a reasonable standard of SWAT knowledge\n" +
        "- Have good grammar, spelling, and punctuation\n" +
        "- Read all server rules before applying."
      );

    const staffButton = new ButtonBuilder()
      .setLabel('Apply for Staff Team')
      .setStyle(ButtonStyle.Link)
      .setURL('https://forms.gle/3Q6UWYGVWSBqekdX8');

    const leoButton = new ButtonBuilder()
      .setLabel('Apply for LEO Supervisor')
      .setStyle(ButtonStyle.Link)
      .setURL('https://forms.gle/XaY6KdS1KQppcTgf8');

    const swatButton = new ButtonBuilder()
      .setLabel('Apply for Atlanta SWAT')
      .setStyle(ButtonStyle.Link)
      .setURL('https://forms.gle/CQwCboAb5GeMDYA49');

    const row = new ActionRowBuilder().addComponents(staffButton, leoButton, swatButton);

    try {
      await message.channel.send({ embeds: [embed], components: [row] });
    } catch (error) {
      console.error('Failed to send application post:', error);
      await message.reply('❌ There was an error posting the application message.');
    }
  },
};



