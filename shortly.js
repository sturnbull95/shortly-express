var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');
var session = require('express-session');
// const uuid = require('uuid/v4');
var app = express();

var isAuthentic = false;
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
app.use(session({secret: 'ssshhhhh'}));

// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

var sess;
app.get('/',
function(req, res) {
  // sess = req.session;
  if (sess) {
    res.render('index');
  } else {
    res.redirect('login');
  }
  //check to see if logged in
  // res.render('index');
});

app.get('/create',
function(req, res) {
  // sess = req.session;
  if (sess) {
    res.render('index');
  } else {
    res.redirect('login');
  }
});

app.get('/links',
function(req, res) {
  // sess = req.session;
  // console.log(sess.username)
  if (sess) {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);
    });
  } else {
    res.redirect('login');
  }
});

app.post('/links',
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/
app.get('/login',
function(req,res){
  res.render('login');
});

app.get('/logout',
function(req,res){
  sess = null;
  res.render('login');
});


app.post('/login', function(req,res){
  var username = req.body.username;
  var password = req.body.password;
  sess = req.session;
  sess.username = username;
  sess.password = password;
  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      req.url = '/index';
      res.redirect('/');
    } else {
        res.redirect('/login');
    }
  });
});

app.post('/signup', function(req,res){
  var username = req.body.username;
  var password = req.body.password;
  new User({ username: username }).fetch().then(function(found) {
    if (found) {
      res.render('login');
    } else {
        Users.create({
          username:username,
          password:password
        })
        .then(function(obj) {
          res.redirect('/');
        });
    }
  });
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
