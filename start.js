require('./bot.js');
require('./events.js');
const { client, CONFIG } = require('./bot.js');

if (!CONFIG.token || CONFIG.token.includes('ISI_')) {
  console.error('❌ Token belum diisi!');
  process.exit(1);
}
if (!CONFIG.guildId || CONFIG.guildId.includes('ISI_')) {
  console.error('❌ Guild ID belum diisi di config.json!');
  process.exit(1);
}

client.login(CONFIG.token);
