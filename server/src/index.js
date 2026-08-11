const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const config = require('./config');
const { auth } = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/error');
const { setMongoConnected, seedMemory } = require('./store');

const app = express();

app.use(helmet());
app.use(compression());
app.use(
  cors({
    origin: config.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
if (config.nodeEnv !== 'test') app.use(morgan('dev'));

app.use('/api/auth', auth, require('./routes/auth'));
app.use('/api/users', auth, require('./routes/users'));
app.use('/api/products', auth, require('./routes/products'));
app.use('/api/suppliers', auth, require('./routes/suppliers'));
app.use('/api/stock-movements', auth, require('./routes/stock'));
app.use('/api/orders', auth, require('./routes/orders'));
app.use('/api/shifts', auth, require('./routes/shifts'));
app.use('/api/reports', auth, require('./routes/reports'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString(), mongo: mongoose.connection.readyState === 1 })
);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    setMongoConnected(true);
    console.log('Connected to MongoDB');
  } catch (err) {
    setMongoConnected(false);
    console.warn('MongoDB unavailable — running in in-memory mode.');
    console.warn(`  ${err.message}`);
    await seedMemory();
    console.log('In-memory store seeded with demo data.');
  }

  app.listen(config.port, () => {
    console.log(`Malt & Lime API running on port ${config.port}`);
  });
}

start();

module.exports = app;
