var config = {};

// express
config.expressSessionSecret = '';
config.apiPort = 4067;
config.corsOrigin = '';

// postgresql
config.PGSQL_HOST = 'localhost';
config.PGSQL_PORT = 5436;
config.PGSQL_DB = '';
config.PGSQL_USER = '';
config.PGSQL_PASSWORD = '';

// mongo
config.MONGODB_HOST = '';
config.MONGODB_DB = '';
config.MONGODB_USER = '';
config.MONGODB_PASSWORD = '';

// sentinel-hub
config.clientID = '';
config.clientSecret = '';

// other
config.clientRedirect = '/maps/monitoring';

module.exports = config;