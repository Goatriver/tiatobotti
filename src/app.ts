const { App } = require('@slack/bolt');
require('dotenv').config()

// Initialize the app variable
export const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  port: process.env.PORT,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Require all the events
require('./tiatobotti/views');
require('./tiatobotti/commands');
require('./tiatobotti/actions');

// Kickstart the app up!
(async () => {
  await app.start();
  console.log('App is HOT!');
})();

