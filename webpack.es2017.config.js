const config = require('./webpack.config');

config.output.filename = '[name].es2017.js';
config.module.loaders = [];
module.exports = config;
