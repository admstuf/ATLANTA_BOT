const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, Events, ComponentType } = require('discord.js');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    // Check if the user has the role allowed to run !ticket
    const allowedRoleId = '1387493566225322114'; // role who can run !ticket
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('🎫 Open a Ticket')
      .setDescription(
        `Open any of the tickets below and we will help you solve the issue you are having! If you are reporting a staff member, evidence is required. Choose the category below that fits your inquiry.\n\n`
        + `❓ | **General Support**: For general questions. Open this if no other category fits your topic!\n\n`
        + `🤝 | **Partnership**: Open this ticket if you are interested in partnering with our server!\n\n`
        + `⚠️ | **Management Support**: Open this ticket if you are reporting a staff member.\n\n`
        + `🎮 | **In-game Support**: To report a player in-game, used for mod scenes.`
      )
      .setColor(0x5865F2);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Choose your ticket category')
      .addOptions([
        {
          label: 'General Support',
          description: 'Open a general support ticket',
          value: 'general',
          emoji: '❓',
        },
        {
          label: 'Partnership',
          description: 'Apply for a partnership',
          value: 'partnership',
          emoji: '🤝',
        },
        {
          label: 'Management Support',
          description: 'Report a staff member or management issue',
          value: 'management',
          emoji: '⚠️',
        },
        {
          label: 'In-game Support',
          description: 'Report players in-game or request mod assistance',
          value: 'ingame',
          emoji: '🎮',
        },
      ]);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [row] });
  },
  async setup(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isStringSelectMenu()) return;
      if (interaction.customId !== 'ticket_category') return;

      const categoryId = '1380595048273412127';
      const category = interaction.values[0];
      const user = interaction.user;

      const roleMap = {
        ingame: '1379853523986022510',
        management: '1379809709871071352',
        general: '1390942686026010645',
        partnership: '1379809709871071352',
      };
      const allowedRole = roleMap[category];
      const channelName = `ticket-${category}-${user.username}`;

      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: categoryId,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: allowedRole, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
        ],
      });

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setDescription(`Hello ${user}, thank you for opening a **${category}** ticket. Please explain your issue or request below.`)
        .setColor(0x5865F2);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('close_ticket')
          .setLabel('🔒 Close Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('close_reason')
          .setLabel('📄 Close with Reason')
          .setStyle(ButtonStyle.Secondary),
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
        const confirmButton = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('confirm_close')
            .setLabel('✅ Confirm Close')
            .setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ content: 'Are you sure you want to close this ticket?', components: [confirmButton], ephemeral: true });
      }

      if (customId === 'confirm_close') {
        await channel.delete().catch(() => {});
      }

      if (customId === 'close_reason') {
        await interaction.reply({ content: 'Please send your reason for closing this ticket. This will auto-close after.', ephemeral: true });
        const filter = m => m.author.id === user.id;
        const collector = channel.createMessageCollector({ filter, max: 1, time: 60000 });

        collector.on('collect', async m => {
          await channel.send(`🔒 Ticket closed by ${user} with reason: ${m.content}`);
          await channel.delete().catch(() => {});
        });

        collector.on('end', collected => {
          if (collected.size === 0) interaction.followUp({ content: '⏰ You did not provide a reason in time.', ephemeral: true });
        });
      }

      if (customId === 'claim_ticket') {
        const roleAllowed = Object.values(roleMap).includes(interaction.member.roles.highest.id);
        if (!roleAllowed) return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });

        await channel.send(`🛡️ Ticket claimed by ${interaction.user}. <@${ticketOwner?.id}>`);
        await interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }
    });
  }
};
