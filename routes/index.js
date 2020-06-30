const express = require('express');
const passport = require('passport');
const router = express.Router();
const clientRedirect = '/monitoring';
const DB = require('../db');

// globals
const table_name = 'public.platform';
const table_fishnet = 'public.fishnet';

// functions
const subGeoID = (geoid) => { return geoid.substring(0,15) }

// error routine
const onError = (res, msg, error) => {
	res.send({success: false, posted: msg, details: error});
}

//==========================//
// user authentication bits //
//==========================//
// auth the user when they POST the data
router.post(`/login`, (req, res, callback) => {
	passport.authenticate('local', (err, user, info) => {
		if (err) return callback(err);
		if (!user) return res.redirect(`${clientRedirect}?info=${info}`);
		req.login(user, (loginError) => {
			if (loginError) return callback(err);
			return res.redirect(clientRedirect);
		})
	})(req, res, callback);
});

// logout page
router.get('/logout', (req, res) => {
	req.logout();
	res.send('success');
});

// user page so client can check whether he logged in
router.get(`/user`, (req, res) => {
	res.send({user: req.user});//, cookies: req.cookies});
});


//=========================//
// postgresql map requests //
//=========================//
// raiting
router.get('/stats', async function(req, res) {
	var userInfo = req.user;
	if (userInfo) {
		DB.pgsql.many(`SELECT owner, sum(area) AS area FROM ${table_name} GROUP BY owner ORDER BY area DESC`).then((dataArea) => {
			DB.pgsql.many(`SELECT owner, count(id) AS count FROM ${table_name} GROUP BY owner ORDER BY count DESC`).then((dataCount) => {
				res.send({area: dataArea, count: dataCount});
			});
		});
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});

// load polygons from the DB
router.post('/load', async function(req, res) {
	var userInfo = req.user;
	if (userInfo) {
		DB.pgsql.any(
			`SELECT id, st_asgeojson(geom,4326) AS geojson, geoid, area, date, comments, approved, owner
			FROM ${table_name} ORDER BY id ASC`)
		.then(function(data) {
			// form a geojson object from db data
			var geojson = {"type":"FeatureCollection", "features":[]}
			data.forEach(obj => {
				var feature = {"type": "Feature", "geometry": '', "properties": {}};
				Object.entries(obj).forEach(([key, value]) => {
					if (key === 'geojson') {
						feature.geometry = JSON.parse(value);
					} else {
						feature.properties[key] = value;
					}
				});
				geojson.features.push(feature);
			});

			// push data back to user
			res.send(geojson);
		});
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});

//=========//
// fishnet //
// load fishnet from the db
router.get('/load_fishnet', async function(req, res) {
	var userInfo = req.user;
	if (userInfo) {
		DB.pgsql.many(`SELECT gid, st_asgeojson(geom,4326) AS geojson, done FROM ${table_fishnet}`).then(function(data) {
			// form a geojson object from db data
			var geojson = {"type":"FeatureCollection", "features":[]}
			data.forEach(obj => {
				var feature = {"type": "Feature", "geometry": '', "properties": {}};
				Object.entries(obj).forEach(([key, value]) => {
					if (key === 'geojson') {
						feature.geometry = JSON.parse(value);
					} else {
						feature.properties[key] = value;
					}
				});
				geojson.features.push(feature);
			});
			// push data back to user
			res.send(geojson);
		});
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});
// change status of the fishnet polygon
router.post('/fishnet_change', async function(req, res) {
	// user data
	const userInfo = req.user;

	// get post parameters
	const gid = req.body.gid;
	const status = req.body.status;

	// check if user logged in
	if (userInfo) {
		// get user details
		const editor = userInfo.editor;

		// only admins can change fishnet status
		if (editor) {
			DB.pgsql.none(`UPDATE ${table_fishnet} SET done=$1 WHERE gid=$2`, [status, gid]).then(function() {
				res.send({success: true, posted: `Fishnet <strong>${gid}</strong> updated successfully`});
			}).catch(error => { onError(res, `Error changing status, please try again`, error) });
		} else {
			res.send({success: false, posted: 'You are not allowed to change fishnet status'});
		}
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});
// load cell's info from the db, to generate up-to-date popup
router.get('/fishcellinfo/:gid', async function(req, res) {
	const gid = req.params.gid;
	DB.pgsql.one(`SELECT gid, done FROM ${table_fishnet} WHERE gid=$1`, [gid]).then(function(data) {
		res.send(data);
	}).catch(error => { onError(res, `Error, please try again`, error) });
});



// load latest feature's info from the db, to generate up-to-date popup
router.get('/polyinfo/:geoid', async function(req, res) {
	const geoid = req.params.geoid;
	DB.pgsql.one(`SELECT id, date, geoid, area, comments, approved, owner FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function(data) {
		res.send(data);
	}).catch(error => { onError(res, `Error retrieving features, please try again`, error) });
});

// load feature's geometry from the db
router.get('/polygeometry/:geoid', async function(req, res) {
	const geoid = req.params.geoid;
	DB.pgsql.one(`SELECT id, date, geoid, st_asgeojson(geom,4326), area, comments, approved, owner FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function(data) {
		res.send(data);
	}).catch(error => { onError(res, `Error retrieving geometry, please try again`, error) });
});

// delete feature from the db
router.get('/delete/:geoid', async function(req, res) {
	// user data
	const userInfo = req.user;
	// geoid
	const geoid = req.params.geoid;

	// check if user logged in
	if (userInfo) {
		// get user details
		const editor = userInfo.editor;
		const username = userInfo.username;

		// check if record in db was approved
		DB.pgsql.one(`SELECT approved FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function(out) {
			if (out.approved) {
				// check if you are an admin, if not => error
				if (editor) {
					// user is an admin, proceed with deleting
					DB.pgsql.none(`DELETE FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function() {
						res.send({success: true, posted: `Feature <strong>${subGeoID(geoid)}</strong> deleted successfully`});
					}).catch(error => { onError(res, `Error deleting feature ${subGeoID(geoid)}, please try again`, error) });
				} else {
					res.send({success: false, posted: 'You are not allowed to delete Approved features'});
				}
			} else {
				// record is not approved, you can remove it if it's yours
				DB.pgsql.one(`SELECT owner FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function(out) {
					// if it's your polygon or you are an editor
					if (username.toString() === out.owner.toString() || editor) {
						// modifying feature
						DB.pgsql.none(`DELETE FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function() {
							res.send({success: true, posted: `Feature <strong>${subGeoID(geoid)}</strong> deleted successfully`});
						}).catch(error => { onError(res, `Error deleting feature ${subGeoID(geoid)}, please try again`, error) });
					} else {
						res.send({success: false, posted: 'You can only delete your own polygons'});
					}
				})

			}
		});
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});


// save comment routine
router.post('/save_comment', async function(req, res) {
	// get post parameters
	const geoid = req.body.geoid;
	const comments = req.body.comments;

	// get user data
	const userInfo = req.user;

	// check if user logged in
	if (userInfo) {
		DB.pgsql.none(`UPDATE ${table_name} SET comments=$1 WHERE geoid=$2`, [comments, geoid]).then(function() {
			res.send({success: true, posted: `Comment of <strong>${subGeoID(geoid)}</strong> updated successfully`});
		}).catch(error => { onError(res, `ERROR during comment UPDATE, please try again [${subGeoID(geoid)}]`, error) });
	}
});


// change approval
router.post('/change_approval', async function(req, res) {
	
	// get post parameters
	const geoid = req.body.geoid;
	const approval = req.body.approval;

	// get user data
	const userInfo = req.user;

	// check if user logged in
	if (userInfo) {
		// get user details
		const editor = userInfo.editor;

		// check if user is an admin, if not => error
		if (editor) {
			// user is an admin, proceed changing approval
			DB.pgsql.none(`UPDATE ${table_name} SET approved=$1 WHERE geoid=$2`, [approval, geoid]).then(function() {
				res.send({success: true, posted: `Approval status of <strong>${subGeoID(geoid)}</strong> changed successfully`});
			}).catch(error => { onError(res, `ERROR during approval UPDATE, please try again [${subGeoID(geoid)}]`, error) });
		} else {
			res.send({success: false, posted: `You are not allowed to change approval status, ${userInfo.username} [${editor}]`});
		}
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});

// mass change approval inside a fishnet sector
router.post('/mass_change_approval', async function(req, res) {
	
	// get post parameters
	const gid = parseInt(req.body.gid);
	const approval = req.body.approval;

	// get user data
	const userInfo = req.user;

	// check if user logged in
	if (userInfo) {
		// get user details
		const editor = userInfo.editor;

		// check if user is an admin, if not => error
		if (editor) {
			// user is an admin, proceed changing approval
			// approve all polygons inside a fishnet cell
			DB.pgsql.none(`UPDATE ${table_name}
							SET approved = $1
							FROM (
								SELECT f.*, b.*
								FROM ${table_name} b, (SELECT geom AS fishnet_geom FROM ${table_fishnet} WHERE gid = $2) f
								WHERE ST_Intersects(b.geom, f.fishnet_geom) = true
							) as sub
							WHERE ${table_name}.geoid = sub.geoid`, [(approval) ? 'true' : 'false', gid]).then(function() {
								res.send({success: true, posted: `Approval status of polygons from <strong>${gid}</strong> changed successfully`});
							}).catch(error => { onError(res, `ERROR during approval UPDATE, please try again [${gid}]`, error) });
		} else {
			res.send({success: false, posted: `You are not allowed to change approval status, ${userInfo.username} [${editor}]`});
		}
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});


// save polygons/features to the db 
router.post('/save', async function(req, res) {
	// modifying feature in DB
	const updateFeature = (array) => {
		DB.pgsql.none(
			`UPDATE ${table_name} SET area=$2, geom=ST_SetSrid(ST_GeomFromGeoJSON($3), 4326), comments=$4, date=$5 WHERE geoid=$1`, array
		).then(function() {
			res.send({success: true, posted: `Feature <strong>${subGeoID(geoid)}</strong> modified successfully`});
		}).catch(error => { onError(res, `ERROR during UPDATE, please try again [${subGeoID(geoid)}]`, error) });
	}

	// get post parameters
	const geoid = req.body.geoid;
	const area = req.body.area;
	const geom = req.body.geom;
	const comments = req.body.comments;
	const date = req.body.date;

	// get user data
	const userInfo = req.user;

	// check if user logged in
	if (userInfo) {

		// get user details
		const username = userInfo.username;
		const editor = userInfo.editor;

		// check if feature with this geoid exists
		DB.pgsql.one(`SELECT EXISTS(SELECT 1 FROM ${table_name} WHERE geoid=$1)`, [geoid]).then(function(data) {
			// update feature if it's not approved
			if (data.exists) {
				// check if record in db was approved
				DB.pgsql.one(`SELECT approved FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function(out) {
					if (out.approved) {
						// check if you are an admin, if not => error
						if (editor) {
							// user is an admin, proceed with editing
							updateFeature([geoid, area, geom, comments, date]);
						} else {
							res.send({success: false, posted: 'You are not allowed to modify Approved features'});
						}
					} else {
						// record is not approved, you can change it if it's yours
						DB.pgsql.one(`SELECT owner FROM ${table_name} WHERE geoid=$1`, [geoid]).then(function(out) {
							// if it's your polygon or you are an editor
							if (username.toString() === out.owner.toString() || editor) {
								// modifying feature
								updateFeature([geoid, area, geom, comments, date]);
							} else {
								res.send({success: false, posted: 'You can only edit your own polygons'});
							}
						})

					}
				});
			// create a new feature
			} else {
				DB.pgsql.none(
					`INSERT INTO ${table_name}(geoid, area, geom, comments, owner, date) VALUES($1, $2, ST_SetSrid(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6)`,
					[geoid, area, geom, comments, username, date]
				).then(function() {
					res.send({success: true, posted: `Feature <strong>${subGeoID(geoid)}</strong> created successfully`});
				}).catch(error => { onError(res, `ERROR during INSERT, please try again [${subGeoID(geoid)}]`, error) });
			}
		});
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});



//=================//
// user management //
//=================//
// create a new regular (non-admin) user
router.post('/register_new_user', async function(req, res) {
	// get post parameters
	const username = req.body.username;
	const password = req.body.password;

	// get user data
	const userInfo = req.user;

	// check if user logged in
	if (userInfo) {
		// get user details
		const editor = userInfo.editor;

		// check if user is an admin, if not show an error
		if (editor) {
			// user is an admin, create a new user
			DB.mongooseUserDetails.register({username:username, active: false}, password, (err, user) => {
				// one-liner
				res.send( {success: (!err), posted: ((err) ? `Error, ${err}` : `User ${username} was successfully created.`)} );
			});
		} else {
			res.send({success: false, posted: 'You are not allowed to create new users'});
		}
	}
});
// remove a user
router.post('/remove_user', async function(req, res) {
	// get post parameters
	const req_username = req.body.username;

	// get user data
	const userInfo = req.user;

	// check if user logged in
	if (userInfo) {
		// get user details
		const editor = userInfo.editor;

		// check if user is an admin, if not show an error
		if (editor) {
			// user is an admin, remove entry
			DB.mongooseUserDetails.deleteOne({'username': req_username}, (err) => {
				res.send( {success: (!err), posted: ((err) ? `Error, ${err}` : `User ${req_username} was removed successfully.`)} );
			});
		} else {
			res.send({success: false, posted: 'You are not allowed to remove users'});
		}
	}
});
// delete feature from the db
router.get('/load_users', async function(req, res) {
	// user data
	const userInfo = req.user;

	// check if user logged in
	if (userInfo) {
		// get user details
		const editor = userInfo.editor;

		// only admins can do that
		if (editor) {
			DB.mongooseUserDetails.find({ editor: false }).exec((err, docs) => {
				// one-liner
				console.log(docs);
				res.send( {success: (!err), posted: ((err) ? `Error, ${err}` : docs)} );
			});
		} else {
			res.send({success: false, posted: 'You are not allowed to retrieve users list'});
		}
	} else {
		onError(res, `You are not authenticated, please reload the page`, '');
	}
});


module.exports = {passport, router}