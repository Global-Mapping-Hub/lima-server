const axios = require('axios');
const qs = require('qs');
const express = require('express');
const router = express.Router();
const config = require('../config');

// headers for our requests
const tokenHeaders = {headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'}};
const datesHeaders = {headers: {'Content-Type': 'application/json'}};

// error routine
const onError = (res, msg, error) => {
	res.send({success: false, posted: msg, details: error});
}

// setting up axios
const instance = axios.create({
	baseURL: "https://services.sentinel-hub.com"
})

// get sentinel-hub token
router.get('/gettoken', (req, res) => {
	var userInfo = req.user;

	if (userInfo) {
		const tokenBody = qs.stringify({
			client_id: config.clientID,
			client_secret: config.clientSecret,
			grant_type: "client_credentials"
		});
		// all requests using this instance will have an access token automatically added
		instance.post('/oauth/token', tokenBody, tokenHeaders).catch(err => {
			onError(res, `Something went wrong`, err);
		}).then(resp => {
			Object.assign(instance.defaults, {headers: {authorization: `Bearer ${resp.data.access_token}`}});
			res.send(`success`);
		})
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});

// get available dates
router.post('/getdates', async function(req, res) {
	var userInfo = req.user;

	// get post parameters
	const bbox = req.body.bbox;
	const datetime = req.body.datetime;
	const collection = req.body.collection;
	const limit = parseInt(req.body.limit);

	if (userInfo) {
		const datesBody = {
			bbox: bbox,
			datetime: datetime,
			collections: [collection],
			limit: limit,
			distinct: "date"
		}

		// all requests using this instance will have an access token automatically added
		instance.post('/api/v1/catalog/search', datesBody, datesHeaders).catch(err => {
			onError(res, `Something went wrong`, err);
		}).then(resp => {
			res.send(resp.data);
		})
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});

module.exports = {router};