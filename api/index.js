const { app, connectMongo } = require('../server/src/app');

let initialized = false;
let initializationPromise = null;

async function initialize() {
  if (initialized) return;

  if (!initializationPromise) {
    initializationPromise = connectMongo()
      .then(() => {
        initialized = true;
      })
      .finally(() => {
        initializationPromise = null;
      });
  }

  await initializationPromise;
}

module.exports = async (req, res) => {
  await initialize();
  return app(req, res);
};
