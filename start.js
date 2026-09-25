// Token & ID diambil dari Environment Variables (Railway)
require('./bot.js');
require('./events.js');
const { client, CONFIG } = require('./bot.js');
client.login(CONFIG.token);
