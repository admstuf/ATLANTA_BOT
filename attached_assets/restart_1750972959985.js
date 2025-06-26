module.exports = {
  name: 'restart',
  description: 'Restart the bot (owner only).',
  ownerOnly: true,

  async execute(message) {
    if (message.author.id !== '764295301774442526') {
      return message.reply('❌ You do not have permission to restart the bot.');
    }

    await message.reply('🔄 Restarting...');
    process.exit(0);
  }
};

