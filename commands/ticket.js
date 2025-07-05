const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionFlagsBits,
  ButtonBuilder,
  ButtonStyle,
  Events,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    const allowedRoleId = '1387493566225322114'; // role who can run !ticket
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const embed = new EmbedBuilder()
      .setTitle('🎫 Open a Ticket')
      .setDescription(
        `Open any of the tickets below and we will help you solve the issue you are having! If you are reporting a staff member, evidence is required. Choose the category below that fits your inquiry.\n\n`
        + `❓ | **General Support**: For general questions. Open this if no other category fits your topic!\n\n`
        + `🤝 | **Partnership**: Open this ticket if you are interested in partnering with our server!\n\n`
        + `⚠️ | **Management Support**: Open this ticket if you are reporting a staff member.\n\n`
        + `🎮 | **In-game Support**: To report a player in-game, used for mod scenes.\n\n`
        + `📷 | **Media Application**: Open this ticket to apply for Atlanta Media Team!`
      )
      .setColor(0xb00000);

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category')
      .setPlaceholder('Choose your ticket category')
      .addOptions([
        { label: 'General Support', description: 'Open a general support ticket', value: 'general', emoji: '❓' },
        { label: 'Partnership', description: 'Apply for a partnership', value: 'partnership', emoji: '🤝' },
        { label: 'Management Support', description: 'Report a staff member or management issue', value: 'management', emoji: '⚠️' },
        { label: 'In-game Support', description: 'Report players in-game or request mod assistance', value: 'ingame', emoji: '🎮' },
        { label: 'Media Application', description: 'Apply for the Media Team', value: 'media', emoji: '📷' },
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
        media: '1390951563366895647',
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

      let ticketMessage;
      if (category === 'media') {
        ticketMessage = `Hello ${user}, please fill out the following:\n\n`
          + `**Roblox username:**\n\n`
          + `**Age:**\n\n`
          + `**Why do you want to apply?**\n\n`
          + `**How active will you be if you’re accepted?**\n\n`
          + `**Please showcase your previous work below. (Preferably ERLC Roleplay scenes. 2-5 pictures.)**`;
      } else {
        ticketMessage = `Hello ${user}, thank you for opening a **${category}** ticket. Please explain your issue or request below.`;
      }

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setDescription(ticketMessage)
        .setColor(0xb00000);

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
      if (!interaction.isButton() && !interaction.isModalSubmit()) return;

      const { customId, channel, user } = interaction;

      if (customId === 'close_ticket') {
        const modal = new ModalBuilder()
          .setCustomId('close_ticket_modal')
          .setTitle('Close Ticket')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('close_reason')
                .setLabel('Reason for closing')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
            )
          );
        return await interaction.showModal(modal);
      }

      if (interaction.isModalSubmit() && interaction.customId === 'close_ticket_modal') {
        const reason = interaction.fields.getTextInputValue('close_reason');
        const messages = await channel.messages.fetch({ limit: 100 });
        const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

        let transcript = `Transcript for ticket: ${channel.name}\nClosed by: ${interaction.user.tag}\nReason: ${reason}\n\n`;
        for (const msg of sorted.values()) {
          const time = new Date(msg.createdTimestamp).toLocaleString();
          transcript += `[${time}] ${msg.author.tag}: ${msg.content}\n`;
        }

        const ticketOwnerId = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel))?.id;
        const ticketOwner = ticketOwnerId ? await interaction.guild.members.fetch(ticketOwnerId).catch(() => null) : null;

        if (ticketOwner) {
          await ticketOwner.send({
            content: `📝 Your ticket ${channel.name} has been closed.\n**Reason:** ${reason}\n\n**Transcript:**\n${transcript.slice(0, 1900)}`
          }).catch(() => {});
        }

        await interaction.user.send({
          content: `✅ You closed ticket ${channel.name}.\n**Transcript:**\n${transcript.slice(0, 1900)}`
        }).catch(() => {});

        await interaction.reply({ content: '✅ Ticket closed and transcript sent.', ephemeral: true });
        await channel.delete().catch(() => {});
      }

      if (customId === 'claim_ticket') {
        const ticketOwnerId = channel.permissionOverwrites.cache.find(po => po.type === 1 && po.allow.has(PermissionFlagsBits.ViewChannel))?.id;
        const ticketOwner = ticketOwnerId ? await interaction.guild.members.fetch(ticketOwnerId).catch(() => null) : null;

        const roleAllowed = Object.values(roleMap).includes(interaction.member.roles.highest.id);
        if (!roleAllowed) return interaction.reply({ content: '🚫 You do not have permission to claim this ticket.', ephemeral: true });

        await channel.send(`🛡️ Ticket claimed by ${interaction.user}. <@${ticketOwner?.id}>`);
        await interaction.reply({ content: '✅ You have claimed this ticket.', ephemeral: true });
      }
    });
  }
};






