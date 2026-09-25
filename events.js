const { REST, Routes } = require('discord.js');
const { client, CONFIG, DATA, saveData, lockDown, unlockDown } = require('./bot.js');
const { commands } = require('./commands.js');
const H = require('./handlers.js');

client.once('ready', async () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
  console.log(`📡 Guilds: ${client.guilds.cache.size}`);

  const rest = new REST({ version: '10' }).setToken(CONFIG.token);
  try {
    const body = commands.map(c => c.toJSON());
    await rest.put(
      Routes.applicationGuildCommands(CONFIG.clientId, CONFIG.guildId),
      { body }
    );
    console.log('✅ Slash commands registered.');
  } catch (e) {
    console.error('Register error:', e.message);
  }
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  try {
    switch (interaction.commandName) {
      case 'setup':
        await H.handleSetup(interaction);
        break;
      case 'lockdown': {
        const reason = interaction.options.getString('reason') || 'Manual lockdown';
        await interaction.deferReply();
        await lockDown(interaction.guild, CONFIG.antiRaid.lockdownDurationMin, reason);
        await interaction.editReply({ content: '🚨 Lockdown aktif!' });
        break;
      }
      case 'unlock':
        await interaction.deferReply();
        await unlockDown(interaction.guild);
        await interaction.editReply({ content: '✅ Lockdown dimatikan.' });
        break;
      case 'whitelist':
        await H.handleWhitelist(interaction, DATA, saveData);
        break;
      case 'purge':
        await H.handlePurge(interaction);
        break;
      case 'slowmode':
        await H.handleSlowmode(interaction);
        break;
      case 'raidguard':
        await H.handleStatus(interaction, DATA, CONFIG);
        break;
    }
  } catch (e) {
    console.error('Interaction error:', e);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: `❌ ${e.message}`, ephemeral: true }).catch(()=>{});
    }
  }
});

process.on('SIGINT', () => {
  console.log('\n[!] Shutdown...');
  saveData();
  process.exit(0);
});
