process.env.TZ = 'Africa/Lagos';
const { app, connectMongo } = require('./app');
const config = require('./config');

async function start() {
  await connectMongo();

  app.listen(config.port, () => {
    console.log(`Malt & Lime API running on port ${config.port}`);
  });
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start Malt & Lime API:', err);
    process.exit(1);
  });
}

module.exports = app;
