const serverless = require('serverless-http');
const app = require('../expressApp');

module.exports.handler = serverless(app);
