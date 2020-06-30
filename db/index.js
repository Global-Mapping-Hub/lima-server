const pgp = require('pg-promise')()
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

// TODO: move postgresql to config.js
const PGSQL_SERVER = 'localhost';
const PGSQL_PORT = 5432;
const PGSQL_DB = '';
const PGSQL_USER = '';
const PGSQL_PASSWORD = '';

const MONGODB_USER = ''
const MONGODB_PASSWORD = ''
const MONGODB_SERVER = 'localhost'
const MONGODB_TABLE = 'monitoring_db'

const pgsql = pgp({
	host: PGSQL_SERVER,
	port: PGSQL_PORT,
	database: PGSQL_DB,
	user: PGSQL_USER,
	password: PGSQL_PASSWORD
});

mongoose.connect(`mongodb://${(MONGODB_USER) ? `${MONGODB_USER}:${MONGODB_PASSWORD}@` : ''}${MONGODB_SERVER}/${MONGODB_TABLE}`, {
	useNewUrlParser: true, 
	useUnifiedTopology: true
});

const Schema = mongoose.Schema;
const UserDetailSchema = new Schema({
	username: String,
	password: String,
	editor: {type: Boolean, default: 0},
	reg_time: {type: Date, default: Date.now}
});

UserDetailSchema.plugin(passportLocalMongoose);
// creating a model from that schema | collection name in db, schema, collection name inside mongoose
const mongooseUserDetails = mongoose.model('userInfo', UserDetailSchema, 'userInfo');

module.exports = {pgsql, mongooseUserDetails};