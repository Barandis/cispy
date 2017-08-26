const config = require('./webpack.config');

config.output.filename = '[name].es.js';
config.module.loaders = [];
module.exports = config;
