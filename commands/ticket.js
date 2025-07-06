const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, Events } = require('discord.js');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    const allowedRoleId = '1387493566225322114'; // role that can use !ticket
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Open a Ticket')
      .setDescription(
        `Open any of the tickets below and we will help you solve the issue you are having! If you are reporting a staff member, evidence is required. Choose the category below that fits your inquiry.\n\n`
        + '❓ | **General Support**: For general questions. Open this if no other category fits your topic!\n\n'
        + '🤝 | **Partnership**: Open this ticket if you are interested in partnering with our server!\n\n'
        + '⚠️ | **Management Support**: Open this ticket if you are reporting a staff member.\n\n'
        + '🎮 | **In-game Support**: To report a player in-game, used for mod scenes.\n\n'
        + '📷 | **Media Application**: Open this ticket to apply for Atlanta Media Team!'
      )
      .setColor('#B22222'); // darker red

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_general')
        .setLabel('General Support')
        .setEmoji('❓')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_partnership')
        .setLabel('Partnership')
        .setEmoji('🤝')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_management')
        .setLabel('Management Support')
        .setEmoji('⚠️')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_ingame')
        .setLabel('In-game Support')
        .setEmoji('🎮')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('ticket_media')
        .setLabel('Media Application')
        .setEmoji('📷')
        .setStyle(ButtonStyle.Primary),
    );

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;
      if (!interaction.customId.startsWith('ticket_')) return;

      const category = interaction.customId.split('_')[1];
      const guild = interaction.guild;
      const user = interaction.user;
      const categoryId = '1380177235499286638'; // category where tickets should be created

      const roleMap = {
        ingame: '1379853523986022510',
        management: '1379809709871071352',
        general: '1390942686026010645',
        partnership: '1379809709871071352',
        media: '1390951563366895647',
      };
      const allowedRole = roleMap[category];
      const channelName = `ticket-${category}-${user.username}`.toLowerCase();

      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: allowedRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });

      let ticketEmbed;
      if (category === 'media') {
        ticketEmbed = new EmbedBuilder()
          .setTitle('📷 Media Team Application')
          .setDescription(
            `Roblox username:\n\n`
            + `Age:\n\n`
            + `Why do you want to apply?\n\n`
            + `How active will you be if you’re accepted?\n\n`
            + `Please showcase your previous work below. (Preferably ERLC Roleplay scenes. 2-5 pictures.)`
          )
          .setColor('#B22222');
      } else {
        ticketEmbed = new EmbedBuilder()
          .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
          .setDescription(`Hello <@${user.id}>, thank you for opening a **${category}** ticket. Please explain your issue or request below.`)
          .setColor('#B22222');
      }

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('claim_ticket')
          .setLabel('🛡️ Claim Ticket')
          .setStyle(ButtonStyle.Primary)
      );

      await channel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed], components: [buttons] });
      await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
    });

    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;

      const { customId, channel, user } = interaction;
      const ticketOwner = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel));

      if (customId === 'close_ticket') {
        await interaction.reply({
          content: 'Please provide your reason for closing this ticket (you have 60 seconds):',
          ephemeral: true,
        });

        const filter = m => m.author.id === user.id;
        const collector = channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async m => {
          const messages = await channel.messages.fetch({ limit: 100 });
          const transcript = messages
            .filter(msg => !msg.author.bot)
            .map(msg => `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}`)
            .reverse()
            .join('\n');

          const transcriptMessage = `Transcript for ticket: ${channel.name}\nClosed by: ${user.tag}\nReason: ${m.content}\n\n${transcript}`;

          await channel.send(`This ticket will now close. Transcript saved.`);
          const ticketLog = interaction.guild.channels.cache.get('1390957675311009902');
          if (ticketLog) {
            await ticketLog.send(`Your ticket ${channel.name} has been closed.\nReason: ${m.content}\n\nTranscript:\n${transcriptMessage.slice(0, 2000)}`);
          }

          await channel.delete().catch(() => {});
        });

        collector.on('end', collected => {
          if (collected.size === 0) interaction.followUp({ content: '⏰ You did not provide a reason in time.', ephemeral: true });
        });
      }

      if (customId === 'claim_ticket') {
        const allowedRoleIds = Object.values({
          ingame: '1379853523986022510',
          management: '1379809709871071352',
          general: '1390942686026010645',
          partnership: '1379809709871071352',
          media: '1390951563366895647',
        });
        const hasRole = allowedRoleIds.some(roleId => interaction.member.roles.cache.has(roleId));
        if (!hasRole) return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });

        await channel.send(`🛡️ Ticket claimed by ${interaction.user}. <@${ticketOwner?.id}>`);
        await interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }
    });
  },
};







