const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
//const upload = require('./upload');
const Gists = require('gists');
require('dotenv').config();
const session = require('express-session');
const qs = require('querystring');
const randomString = require('randomstring');
const csrfString = randomString.generate();
const request = require('request');

var corsOptions = {
	origin: 'http://localhost:4200',
	optionsSuccessStatus: 200
}


const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));
// Add headers
app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:4200');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

//use session
app.use(
  session({
    secret: randomString.generate(),
    cookie: { maxAge: 60000 },
    resave: false,
    saveUninitialized: false
  })
);

// const username = 'trapsta';
// const github = new GitHub({
//   username: YOUR_USERNAME,
//   password: YOUR_PASSWORD,
// });

// // or 
// const github = new GitHub({
//   token: YOUR_TOKEN
// });

// // or 
// const github = new GitHub({
//   bearer: YOUR_JSON_WEB_TOKEN
// });


//const gists = new Gists({ username: username, password: password });
var username;
var access_token;
const gists = new Gists({ token: access_token  });
//console.log(session);

//app.post('/upload', upload);

app.get('/', (req, res) => {
    //res.send('<h3>Back-end is ready. Sending some sniper chimps over to Github to get our Kanban..anas :)...!</h3>');
    res.redirect('http://localhost:4200');
});

app.get('/login', (req, res, next) => {
	//console.log('request is: ' +  req);
	req.session.csrf_string = randomString.generate();
	const githubAuthUrl = 'https://github.com/login/oauth/authorize?' + qs.stringify({
		client_id: process.env.CLIENT_ID,
		redirect_uri: redirect_uri,
		state: req.session.csrf_string,
		scope: 'user,gist,user:email'
	});
	//res.send('Signing you in with Github...');
	res.redirect(githubAuthUrl);
	 // res.send({
  //     retStatus : 200,
  //     redirectTo: githubAuthUrl,
  //     msg : 'Signing you in with Github...' 
  //   });
});



// app.get('/logout', (req, res, next) => {
// 	//console.log(req.session);
// 	req.session.destroy();
// 	//console.log(req.session);
// });
app.get('/logout', function(req, res) {
  req.session.destroy(function(err){
     if(err){
        console.log(err);
     }else{
         console.log(session.access_token);
         //req.end();
         res.redirect('/login');
     }
  });

});


app.get('/login/success', (req, res, next) => {
	//console.log(req.session);
	//res.send('Login Successful. Redirecting back to app...');
	res.sendFile(__dirname + '/public/success.html');
	//console.log(req.session);
});


// Handle the response your application gets.
// Using app.all make sures no matter the provider sent you
// get or post request, they will all be handled
app.all('/redirect', (req, res) => {
  // Here, the req is request object sent by GitHub
  console.log('Request sent by GitHub: ');
  console.log(req.query);

  // req.query should look like this:
  // {
  //   code: '3502d45d9fed81286eba',
  //   state: 'RCr5KXq8GwDyVILFA6Dk7j0LbFNTzJHs'
  // }
  const code = req.query.code;
  const returnedState = req.query.state;

  if (req.session.csrf_string === returnedState) {
    // Remember from step 5 that we initialized
    // If state matches up, send request to get access token
    // the request module is used here to send the post request
    request.post(
      {
        url:
          'https://github.com/login/oauth/access_token?' +
          qs.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            code: code,
            redirect_uri: redirect_uri,
            state: req.session.csrf_string
          })
      },
      (error, response, body) => {
        // The response will contain your new access token
        // this is where you store the token somewhere safe
        // for this example we're just storing it in session
        console.log('Your Access Token: ');
        console.log(qs.parse(body));
        req.session.access_token = qs.parse(body).access_token;
        access_token = req.session.access_token;
        //console.log(access_token);


        // Redirects user to /user page so we can use
        // the token to get some data.
        res.redirect('/login/success');
      }
    );
  } else {
    // if state doesn't match up, something is wrong
    // just redirect to homepage
    res.redirect('/');
  }
});


app.get('/user', (req, res) => {
  // GET request to get user 
  // this time the token is in header instead of a query string
  request.get(
    {
      url: 'https://api.github.com/user',
      headers: {
        Authorization: 'token ' + access_token,
        'User-Agent': 'Login-App'
      }
    },
    (error, response, body) => {
    	//user.push[body];     
      	//console.log(response);
      	//console.log(body.type);
     	//res.send(body);
     	sessionUser(body);
    }
  );

  function sessionUser(obj) {
  	var user = JSON.parse(obj);
  	// console.log(user);
  	// console.log(user.login);
  	username = (user['login']);
  	res.status(200).send(user);
  }
});


app.get('/user/email', (req, res) => {
  // GET request to get user 
  // this time the token is in header instead of a query string
  request.get(
    {
      url: 'https://api.github.com/user/public_emails',
      headers: {
        Authorization: 'token ' + req.session.access_token,
        'User-Agent': 'Login-App'
      }
    },
    (error, response, body) => {
      res.send(body);
    }
  );
});




app.route('/api/gists/:id').get((req, res) => {

	var id = req.params.id;
	console.log(id);
	gists.get(id)
	.then(res => returnGist(res.body))
	.catch(console.error);

	//res.send(res.body);
	function returnGist(resbody) {
		console.log(resbody['files']);
		res.status(200).send(resbody['files']);
	}
});

/*app.route('/api/gists').get((req, res) => {
	//var username = Gists['username'];
	//var url = 'https://api.github.com/users/' + username + '/gists';
	//console.log(username + ' ' + url);
	//console.log(username);
	gists.list(username)
  .then(res => populateGists(res.body));

  function populateGists(payload) {
  	//console.log(payload);
  	res.status(200).send(payload);
  }
});*/


app.route('/api/gists').get((req, res) => {

	request.get({
		url: 'https://api.github.com/gists',
		headers: {
        Authorization: 'token ' + access_token,
        'User-Agent': 'Login-App'
      }
	},(error, response, body) => {
		res.send(body);
	});
});


/*app.get('/api/gists', (req, res) => {
  // GET request to get user 
  // this time the token is in header instead of a query string
  request.get(
    {
      url: 'https://api.github.com/gists',
      headers: {
        Authorization: 'token ' + req.session.access_token,
        'User-Agent': 'Login-App'
      }
    },
    (error, response, body) => {
    	//console.log(req.session);
      res.send(body);
      //populateGists(res.body);
    }
  );

  // function populateGists(payload) {
  // 	//console.log(payload);
  // 	res.status(200).send(payload);
  // }
});*/

app.route('/api/gists').post((req, res) => {
	console.log(req.body[0]);
	var description = req.body.description;
	var public_gist = req.body.public;
	var files = req.body.files;

	var options = {
		"description": description,
		"public": public_gist,
		"files": files
	}


	gists.create(options)
	.then(res => handleCreate(res.body))
	.catch(console.error);

	function handleCreate(resbody) {
		res.status(201).send(resbody);
	}

});


const redirect_uri = process.env.HOST + '/redirect';

app.listen(8000, () => {
	console.log('API started on PORT 8K!');
});