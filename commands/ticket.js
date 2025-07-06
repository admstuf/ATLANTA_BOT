const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, PermissionsBitField } = require('discord.js');
const fs = require('fs');

module.exports = {
  name: 'ticket',
  description: 'Open the ticket panel',
  async execute(message) {
    const allowedRoleId = '1387493566225322114'; // role allowed to run !ticket
    if (!message.member.roles.cache.has(allowedRoleId)) {
      const reply = await message.reply('🚫 You do not have permission to use this command.');
      return setTimeout(() => reply.delete().catch(() => {}), 8000);
    }

    const embed = new EmbedBuilder()
      .setTitle('**Atlanta Roleplay Support**')
      .setDescription(
        'If you wish to report a member or a staff, need to partner with our server, apply for our media team, or have a general question, this is the place to do it! Please select a category where it says "Select Category" and click the ticket you want to open. Opening false tickets can result in a warning.\n\n'
        + '─────────────────────────────\n\n'
        + '**❓ | General Support**: Open a general support ticket if you have a general question about the server, the game, or anything else! (You can use this to get help from HR without pinging them in general).\n\n'
        + '**🤝 | Partnership**: Open this ticket if you are interested in partnering with our server! Make sure you have **at least 50 members**. You can also open this ticket if you have a question about your partnership.\n\n'
        + '**⚠️ | Management Support**: Open this ticket if you are reporting an Atlanta Roleplay staff member. You can also open this ticket to get support from management (only for major questions, if not a major question, please open a general support ticket).\n\n'
        + '**🎮 | In-game Support**: To report an in-game player. Usually used for mod scenes! **Make sure to upload clips with Medal, Streamable, or Youtube links.** Not doing so will result in your report being denied by staff members.\n\n'
        + '**📷 | Media Application**: Open this ticket to apply for Atlanta Media Team! Make sure you have at least 2-5 pictures of high quality and edited. Make sure your pictures aren\'t heavily supported by shaders or other applications. Make sure your 13+ and are not banned in-game or have a large punishment history.\n\n'
        + 'Please do not ping HR in general or in any channels to ask questions, but please open these tickets. Not doing so may result in a warning, or a kick depending on severity. Have a great day!'
      )
      .setColor('#B22222')
      .setThumbnail('https://cdn.discordapp.com/icons/1373057856571441152/6c0b987aaf2152ce0f99b87e1488d532.webp?size=1024');

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_category_select')
      .setPlaceholder('Select a Category')
      .addOptions(
        new StringSelectMenuOptionBuilder().setLabel('❓ General Support').setValue('ticket_general'),
        new StringSelectMenuOptionBuilder().setLabel('🤝 Partnership').setValue('ticket_partnership'),
        new StringSelectMenuOptionBuilder().setLabel('⚠️ Management Support').setValue('ticket_management'),
        new StringSelectMenuOptionBuilder().setLabel('🎮 In-game Support').setValue('ticket_ingame'),
        new StringSelectMenuOptionBuilder().setLabel('📷 Media Application').setValue('ticket_media'),
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await message.channel.send({ embeds: [embed], components: [row] });
  },

  async setup(client) {
    client.on('interactionCreate', async interaction => {
      if (!interaction.isStringSelectMenu()) return;

      const categoryMap = {
        ticket_general: 'general',
        ticket_partnership: 'partnership',
        ticket_management: 'management',
        ticket_ingame: 'ingame',
        ticket_media: 'media'
      };

      const category = categoryMap[interaction.values[0]];
      if (!category) return;

      const categoryId = '1380177235499286638';
      const user = interaction.user;

      const roleMap = {
        general: '1390942686026010645',
        partnership: '1379809709871071352',
        management: '1379809709871071352',
        ingame: '1379853523986022510',
        media: '1390951563366895647',
      };

      const allowedRole = roleMap[category];
      const channelName = `ticket-${category}-${user.username}`.toLowerCase();

      const channel = await interaction.guild.channels.create({
        name: channelName,
        type: 0,
        parent: categoryId,
        permissionOverwrites: [
          { id: interaction.guild.roles.everyone, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
          { id: allowedRole, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
        ],
      });

      let ticketMessage;
      if (category === 'general') {
        ticketMessage = `Hello <@${user.id}>👋, thank you for opening a general ticket. Please explain your issue or request below.`;
      } else if (category === 'partnership') {
        ticketMessage = `Hello <@${user.id}>👋, thank you for opening a partnership ticket! A HR member will be with you shortly. Please fill out this format:\nServer Name:\nServer Owner:\nMembers without bots:\nServer link: (not ad)`;
      } else if (category === 'management') {
        ticketMessage = `Hello <@${user.id}>👋, thank you for opening a management support ticket. Please send me the user of the staff member you are reporting and your form of proof (send the same proof that you will use in in-game support tickets). If you have another question, please send it here and a HR member will be with you.`;
      } else if (category === 'ingame') {
        ticketMessage = `Hello <@${user.id}>👋, thank you for opening an in-game support ticket. Make sure to upload clips with Medal, Streamable, or Youtube links. Not doing so will result in your report being denied by staff members.`;
      } else if (category === 'media') {
        ticketMessage = 'Roblox username:\n\nAge:\n\nWhy do you want to apply?\n\nHow active will you be if you’re accepted?\n\nPlease showcase your previous work below. (Preferably ERLC Roleplay scenes. 2-5 pictures.)';
      }

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket: ${category.charAt(0).toUpperCase() + category.slice(1)}`)
        .setDescription(ticketMessage)
        .setColor('#B22222');

      await channel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed] });
      await interaction.reply({ content: `✅ Your ticket has been created: ${channel}`, ephemeral: true });
    });

    client.on('interactionCreate', async interaction => {
      if (!interaction.isModalSubmit()) return;
      if (interaction.customId !== 'close_ticket_modal') return;

      const reason = interaction.fields.getTextInputValue('close_reason');
      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 100 });
      const ticketUser = channel.permissionOverwrites.cache.find(po => po.type === 1)?.id;
      const transcriptChannelId = '1391251472515207219';

      const transcriptEmbed = new EmbedBuilder()
        .setTitle(`📑 Transcript for ${channel.name}`)
        .setDescription(messages
          .filter(m => !m.author.bot)
          .map(m => `**${m.author.tag}**: ${m.content || '[Attachment]'}\n`)
          .reverse()
          .join('\n') || 'No messages.')
        .setColor('#B22222')
        .setTimestamp();

      const closeEmbed = new EmbedBuilder()
        .setTitle('🎫 Ticket Closed')
        .setDescription(`Ticket closed by ${interaction.user}\n**Reason:** ${reason}`)
        .setColor('#B22222')
        .setTimestamp();

      const transcriptChannel = interaction.guild.channels.cache.get(transcriptChannelId);
      if (transcriptChannel) {
        await transcriptChannel.send({ embeds: [transcriptEmbed] });
      }
      if (ticketUser) {
        const member = await interaction.guild.members.fetch(ticketUser).catch(() => null);
        if (member) await member.send({ embeds: [closeEmbed, transcriptEmbed] }).catch(() => {});
      }

      await interaction.reply({ content: 'Ticket has been closed and transcript sent.', ephemeral: true });
      await channel.delete().catch(() => {});
    });
  },
};









