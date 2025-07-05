const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'appeal',
  description: 'Start a ban appeal',
  async execute(message) {
    // send appeal intro embed + button
    const embed = new EmbedBuilder()
      .setTitle('Ban Appeal')
      .setDescription('If you wish to submit a ban appeal, please press the **Start Appeal** button below.\n\nYou will be asked to answer some questions.')
      .setColor('#B22222'); // firebrick red, darker red

    const button = new ButtonBuilder()
      .setCustomId('start_appeal')
      .setLabel('Start Appeal')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    client.on('interactionCreate', async interaction => {
      if (!interaction.isButton()) return;
      if (interaction.customId !== 'start_appeal') return;

      // Create a private text channel for this user's appeal
      const guild = interaction.guild;
      const user = interaction.user;

      // Create channel name with username and id
      const channelName = `appeal-${user.username.toLowerCase()}-${user.discriminator}`;

      // Create channel with permissions for user and mods only
      const appealCategoryId = '1390968600747311136'; // set your appeals category here
      const modRoleId = '1379809709871071352'; // role who can see appeals

      const channel = await guild.channels.create({
        name: channelName,
        type: 0, // GUILD_TEXT (discord.js v14 uses 0 for text channel)
        parent: appealCategoryId,
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          },
          {
            id: modRoleId,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory],
          },
        ],
      });

      await interaction.reply({ content: `Your appeal channel has been created: ${channel}`, ephemeral: true });

      // Now start collecting answers in the appeal channel
      const questions = [
        'What was your Roblox username when you were banned?',
        'Why were you banned? (Please provide details)',
        'Why should you be unbanned? (At least 5 sentences)',
      ];

      const collectedAnswers = [];

      const filter = m => m.author.id === user.id;
      const collector = channel.createMessageCollector({ filter, time: 10 * 60 * 1000 }); // 10 mins max

      let currentQuestion = 0;

      channel.send(`Hello <@${user.id}>! Let's start your ban appeal. Please answer the following questions:\n\n${questions[currentQuestion]}`);

      collector.on('collect', m => {
        collectedAnswers.push(m.content);
        currentQuestion++;

        if (currentQuestion < questions.length) {
          channel.send(questions[currentQuestion]);
        } else {
          collector.stop('completed');
        }
      });

      collector.on('end', async (_, reason) => {
        if (reason !== 'completed') {
          return channel.send('You did not complete the appeal in time. Please start again if you wish.');
        }

        // Send the appeal transcript to a mod channel
        const modChannel = guild.channels.cache.get('1390957675311009902');
        if (!modChannel) return channel.send('Error: mod appeal log channel not found.');

        const appealEmbed = new EmbedBuilder()
          .setTitle('New Ban Appeal')
          .setColor('#B22222')
          .setDescription(`Ban appeal from <@${user.id}>`)
          .addFields(
            { name: questions[0], value: collectedAnswers[0] || 'No answer' },
            { name: questions[1], value: collectedAnswers[1] || 'No answer' },
            { name: questions[2], value: collectedAnswers[2] || 'No answer' },
          )
          .setTimestamp();

        await modChannel.send({ embeds: [appealEmbed] });

        channel.send('Thank you for submitting your appeal! The moderators have been notified.');
        // Optionally lock or delete the channel after a timeout
        setTimeout(() => channel.delete().catch(() => {}), 5 * 60 * 1000); // delete after 5 mins
      });
    });
  }
};



