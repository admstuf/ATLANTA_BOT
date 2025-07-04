const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  name: 'postapplication',
  description: 'Posts the application info with buttons for applying.',
  async execute(message, args) {
    // Check permission role if needed here, or remove if open to all
    // const allowedRoleId = '1390759183376453764';
    // if (!message.member.roles.cache.has(allowedRoleId)) {
    //   return message.reply('🚫 You do not have permission to use this command.');
    // }

    const embed = new EmbedBuilder()
      .setTitle('Welcome to Atlanta Roleplay!')
      .setThumbnail('https://cdn.discordapp.com/attachments/1385162246707220551/1390213797897179218/IMG_5237-removebg-preview.png?ex=68696b3e&is=686819be&hm=3d8dc381e085cfd286f8ccc53f8c26faa53165d6fe940578a4b4c1597f05038b&')
      .setDescription(`You can apply for staff, SWAT team, and become a LEO supervisor! If you wish to apply, use the buttons below to start! No troll applications, AI usage, or copying of any kind, otherwise you will be blacklisted.`)
      .addFields(
        {
          name: 'Staff Application',
          value:
            `Interested in joining our Strict, Professional staff team to moderate good Roleplays? Apply!\n\n` +
            `Information:\n` +
            `• Being dishonest on ANY of these questions will result in immediate denial of your application\n` +
            `• You must be 13 years or older\n` +
            `• Using AI on any of this application will result in a blacklist from applying\n` +
            `• Have a reasonable standard of Staff knowledge\n` +
            `• Have good grammar, spelling, and punctuation\n` +
            `• Read all server rules before applying.`,
          inline: false,
        },
        {
          name: 'LEO Supervisor Application',
          value:
            `Interested in joining a job that will test how good you are at supervising, and will test your Law Enforcement Officer abilities? LEO Supervisor is what you should apply for!\n\n` +
            `Information:\n` +
            `• Being dishonest on ANY of these questions will result in immediate denial of your application\n` +
            `• You must be 13 years or older\n` +
            `• Using AI on any of this application will result in a blacklist from applying\n` +
            `• Have a reasonable standard of Law Enforcement Officer knowledge\n` +
            `• Have good grammar, spelling, and punctuation\n` +
            `• Read all server rules before applying.`,
          inline: false,
        },
        {
          name: 'Atlanta SWAT Application',
          value:
            `Interested in joining a very risky, action packed job? Atlanta SWAT is what you should apply for!\n\n` +
            `Information:\n` +
            `• Being dishonest on ANY of these questions will result in immediate denial of your application\n` +
            `• You must be 13 years or older\n` +
            `• Using AI on any of this application will result in a blacklist from applying\n` +
            `• Have a reasonable standard of SWAT knowledge\n` +
            `• Have good grammar, spelling, and punctuation\n` +
            `• Read all server rules before applying.`,
          inline: false,
        }
      );

    // Buttons for the three application forms
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('Staff Application')
        .setStyle(ButtonStyle.Link)
        .setURL('https://forms.gle/3Q6UWYGVWSBqekdX8'),

      new ButtonBuilder()
        .setLabel('LEO Supervisor Application')
        .setStyle(ButtonStyle.Link)
        .setURL('https://forms.gle/XaY6KdS1KQppcTgf8'),

      new ButtonBuilder()
        .setLabel('Atlanta SWAT Application')
        .setStyle(ButtonStyle.Link)
        .setURL('https://forms.gle/CQwCboAb5GeMDYA49')
    );

    try {
      await message.channel.send({ embeds: [embed], components: [buttons] });
      await message.reply('✅ Application info posted successfully.');
    } catch (error) {
      console.error('Failed to post application info:', error);
      await message.reply('⚠️ Failed to post application info.');
    }
  },
};
      const row = new ActionRowBuilder().addComponents(button);

      await message.channel.send({ embeds: [embed], components: [row] });
    }
  }
};
