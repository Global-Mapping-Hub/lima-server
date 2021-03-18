const pgp = require('pg-promise')()
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const config = require('../config');

const pgsql = pgp({
	host: config.PGSQL_HOST,
	port: config.PGSQL_PORT,
	database: config.PGSQL_DB,
	user: config.PGSQL_USER ,
	password: config.PGSQL_PASSWORD
});

mongoose.connect(`mongodb://${config.MONGODB_USER}:${config.MONGODB_PASSWORD}@${config.MONGODB_HOST}/${config.MONGODB_DB}`, {
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