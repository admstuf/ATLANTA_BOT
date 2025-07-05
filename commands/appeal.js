const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, Events } = require('discord.js');

module.exports = {
  name: 'appeal',
  description: 'Start a ban appeal',
  async execute(message) {
    // send appeal intro embed + button
    const embed = new EmbedBuilder()
      .setTitle('Ban Appeal')
      .setDescription('If you wish to submit a ban appeal, please press the **Start Appeal** button below.\n\nYou will be asked to answer some questions. Make sure you were banned at least 3 days ago, otherwise your appeal will be declined.')
      .setColor('#B22222');

    const button = new ButtonBuilder()
      .setCustomId('start_appeal')
      .setLabel('Start Appeal')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    client.on(Events.InteractionCreate, async interaction => {
      if (!interaction.isButton()) return;

      // START APPEAL
      if (interaction.customId === 'start_appeal') {
        const guild = interaction.guild;
        const user = interaction.user;

        const channelName = `appeal-${user.username.toLowerCase()}-${user.discriminator}`;
        const appealCategoryId = '1390968600747311136'; // appeals category
        const modRoleId = '1379809709871071352'; // staff role

        const channel = await guild.channels.create({
          name: channelName,
          type: 0,
          parent: appealCategoryId,
          permissionOverwrites: [
            { id: guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
            { id: modRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          ],
        });

        await interaction.reply({ content: `Your appeal channel has been created: ${channel}`, ephemeral: true });

        const questions = [
          'What is your Roblox username?',
          'Why were you banned? (Please provide details with 2+ sentences)',
          'Why should you be unbanned? (At least 5 sentences)',
        ];

        const collectedAnswers = [];
        const filter = m => m.author.id === user.id;
        const collector = channel.createMessageCollector({ filter, time: 10 * 60 * 1000 });

        let currentQuestion = 0;
        channel.send(`Hello <@${user.id}>! Your ban appeal has begun. Please answer the following questions:\n\n${questions[currentQuestion]}`);

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

          const acceptButton = new ButtonBuilder()
            .setCustomId(`accept_appeal_${user.id}`)
            .setLabel('Accept Appeal')
            .setStyle(ButtonStyle.Success);

          const declineButton = new ButtonBuilder()
            .setCustomId(`decline_appeal_${user.id}`)
            .setLabel('Decline Appeal')
            .setStyle(ButtonStyle.Danger);

          const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

          await modChannel.send({ embeds: [appealEmbed], components: [row] });
          channel.send('Thank you for submitting your appeal! Our HR team have been notified.');
          // appeal channel stays open for staff to review manually
        });
      }

      // ACCEPT/DECLINE
      if (interaction.customId.startsWith('accept_appeal_') || interaction.customId.startsWith('decline_appeal_')) {
        const userId = interaction.customId.split('_').pop();
        const guild = interaction.guild;
        const appealedUser = await guild.members.fetch(userId).catch(() => null);

        if (!appealedUser) return interaction.reply({ content: '❌ Could not find the user to notify.', ephemeral: true });

        const action = interaction.customId.startsWith('accept') ? 'accepted' : 'declined';
        const color = action === 'accepted' ? '#00ff00' : '#ff0000';

        const decisionEmbed = new EmbedBuilder()
          .setTitle(`Ban Appeal ${action === 'accepted' ? 'Accepted' : 'Declined'}`)
          .setDescription(`Your ban appeal has been **${action}** by our HR team.`)
          .setColor(color)
          .setTimestamp();

        await appealedUser.send({ embeds: [decisionEmbed] }).catch(() => {});
        const appealChannel = guild.channels.cache.find(ch => ch.name.includes(`appeal-${appealedUser.user.username.toLowerCase()}`));

        if (appealChannel) {
          await appealChannel.send(`<@${userId}> Your appeal has been **${action}** by <@${interaction.user.id}>.`);
          setTimeout(() => appealChannel.delete().catch(() => {}), 60 * 1000);
        }

        await interaction.reply({ content: `✅ Appeal ${action}. User notified and appeal channel updated.`, ephemeral: true });
      }
    });
  }
};




