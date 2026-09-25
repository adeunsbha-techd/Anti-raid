process.env.DISCORD_TOKEN = "MTU1Mjk4NzQxMDQ0OTY5NDgyMQ.Ggpl4X.rFb6scbToIuRqfWqSeEApMHw7zqrpqRs-0Q3S0";
process.env.CLIENT_ID = "1552987410449694821";
process.env.GUILD_ID = "1510255795227590657";

require('./bot.js');
require('./events.js');
const { client, CONFIG } = require('./bot.js');

client.login(CONFIG.token);
