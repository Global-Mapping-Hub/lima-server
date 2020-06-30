const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const r = require('./routes');
const DB = require('./db');
const compression = require('compression');

const expressSession = require('express-session')({
	secret: 'ax8bcdO8gRNqzMJqx45P', // change that
	resave: false,
	saveUninitialized: false
});

// init express app
const app = express();
const apiPort = 4067;

// add socket.io
const http = require('http').Server(app);
const io = require('socket.io')(http);

// compression
app.use(compression());

// init socket.io routines
const socketLogic = require('./sockets');
const sock = new socketLogic(io);

// cors: allow requests from our client
app.use(
	cors({
		origin: "https://example.org/monitoring/",
		methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
		credentials: true // pass through session cookie from browser
	})
);

// body parser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

// init express sessions + passportJS
app.use(expressSession);
app.use(r.passport.initialize())
app.use(r.passport.session())

// put static files here
app.use(express.static("public"));

http.listen(apiPort, () => {
	console.log(`listening on port ${apiPort}`);
});

// PASSPORT LOCAL AUTH
r.passport.use(DB.mongooseUserDetails.createStrategy());
r.passport.serializeUser(DB.mongooseUserDetails.serializeUser()); // invoked on auth
r.passport.deserializeUser(DB.mongooseUserDetails.deserializeUser());

// ROUTES
app.use('/', r.router);