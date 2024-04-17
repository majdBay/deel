const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./model');
const contractRoutes = require('./routes/contractRoutes');
const jobRoutes = require('./routes/jobRoutes');
const balanceRoutes = require('./routes/balanceRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize);
app.set('models', sequelize.models);

app.use('/contracts', contractRoutes);
app.use('/jobs', jobRoutes);
app.use('/balances', balanceRoutes);
app.use('/admin', adminRoutes);

module.exports = app;
