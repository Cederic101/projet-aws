var express = require('express');
var bodyP = require('body-parser');
var cookieP = require('cookie-parser');
var ws = require('ws');
var http = require('http');
var session = require('express-session');
var crypto = require('crypto');
   
var app = express();
app
    .use(bodyP.urlencoded({ extended: false }))
    .use(cookieP());

app.use(express.static(__dirname));
var tableau = [];

var user_conn = [];
var score_user_conn = [];

var twig = require('twig');
app.set('views', 'templates');

var mysql = require('mysql');
var db    = mysql.createConnection({
  host     : '127.0.0.1',  
  user     : 'root', 
  password : 'cederic78',
  database : 'aws'  
});

var sess = session({ 
    secret: "12345",
    resave: false,
    saveUninitialized: false,
});
app.use(sess);

var server = http.createServer(app);
var wsserver = new ws.Server({ 
    server: server,
    verifyClient: function(info, callback) {
        sess(info.req, {}, function() {
            callback(info.req.session.name !== undefined, 403, "Unauthorized");
        });
    },
});

wsserver.broadcast = function broadcast(data) {
  wsserver.clients.forEach(function each(client) {
    if (client.readyState === ws.OPEN) {
      client.send(data);
    }
  });
};

db.query('Update users set score=0',
function(err,rows)
{
	if(!err)
	  {}
});

var n=6;

for(var i=0;i<n;i++)
{
	tableau[i] = [];
	for(var j=0;j<n;j++)
	{
		tableau[i][j] = 1;
	}
}

function set(row,column,user)
{
	if(row>(n-1) || column>(n-1) || typeof row == "undefined" || typeof column == "undefined")
	{
		return {'user' : user,'fin' : 0};
	}
	else
	{
		if(tableau[row][column] == 1)
		{
			tableau[row][column]=0;
			score(user);
			if(check(tableau) == 0)
			{
				if(nb_palier <= 1)
					return {'user' : user,'fin' : 1};
				else
				{
					create_stage();
					nb_palier--;
					return {'user' : user,'fin' : 0};
				}
			}
			return {'user' : user,fin : 0};
		}
		return {'user' : user,fin : 0};
	}
}

function create_stage()
{
	for(var i=0;i<n;i++)
	{
		for(var j=0;j<n;j++)
		{
			tableau[i][j]=1;
		}
	}
}

var nb_palier = 2;

function check()
{
	for(var i=0;i<n;i++)
	{
		for(var j=0;j<n;j++)
		{
			if(tableau[i][j] == 1)
				return 1;
		}
	}
	return 0;
}

function score(user)
{
	var index = user_conn.indexOf(user);
	score_user_conn[index]+=1;
}

var finPartie;

wsserver.on('connection', function(wsconn) 
{
	var json = JSON.stringify(
	{
		'user_connect' : user_conn,
		'score_user_connect' : score_user_conn,
		'tab' : tableau,
		'pal' : nb_palier,
		'type' : 'init'
	});
	wsserver.broadcast(json);
	wsconn.on('message',function(data) 
	{
		var donnees = JSON.parse(data);
		finPartie = set(donnees['row'],donnees['column'],donnees['user']);
		var json = JSON.stringify(
		{
			'user_connect' : user_conn,
			'score_user_connect' : score_user_conn,
			'tab' : tableau,
			'fin' : finPartie['fin'],
			'pal' : nb_palier,
			'type' : 'play'
		});
		wsserver.broadcast(json);	
	});
});

var sel = "12345";

app.get('/fin',function(req, res) 
{
	if(finPartie['user'] && check(tableau) == 0)
		res.render('fin.twig', {'user' : finPartie['user']});
	else
		res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});
});

app.post('/newGame',function(req, res) 
{
	if(check(tableau) == 0)
	{
		for(var i=0;i<score_user_conn.length;i++)
		{
			score_user_conn[i]=0;
		}
		create_stage();
		nb_palier=2;
	}
	res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});
});

app.get('/', function(req, res) 
{
	req.session.name='';
	req.session.login='';
	req.session.pass='';
	req.session.score=0;
	if(req.session.login == '' && req.session.pass == '')
		res.render('index.twig');
	else
	{
		 if(check(tableau) == 0)
			res.render('fin.twig', {'user' : finPartie['user']});
		  else
			res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});
	}
});

app.all('/signup', function(req, res)
{
  if(req.method=='GET')
  {
      if(req.session.login=='' && req.session.pass=='')
      {
          res.render('index.twig');
      }
      else
      {
		  if(check(tableau) == 0)
			res.render('fin.twig', {'user' : finPartie['user']});
		  else
			res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});   
      }
  }
  if(req.method=='POST')
  {
	  req.session.name='';
	  req.session.login='';
	  req.session.pass='';
	  req.session.score=0;
	  var it = 100;
	  crypto.pbkdf2(req.body['pass'],sel,it,128,'sha512',function(err,hash)
	  {
		db.query('INSERT INTO users VALUES (?,?,?,0)', [req.body['nom'],req.body['login'],hash],
		 function(err, result) 
		 { 
		   if(!err)
		   {
			    req.session.login=req.body['login'];
				req.session.pass=hash;
				req.session.name=req.body['nom'];
				req.session.score=0;
				user_conn.push(req.body['login']);
				score_user_conn.push(req.session.score);
				res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});
		   }
		   else
		   {
			  res.render('index.twig',{'result' : 1, 'phrase' : "Utilisateur déjà existant"});
		   }
		 });
	  });
  }
});

app.all('/connect', function(req, res)
{
  if(req.method=='GET')
  {
      if(req.session.login=='' && req.session.pass=='')
      {
          res.render('index.twig',{'result' : 0});
      }
      else
      {
		  if(check(tableau) == 0)
			res.render('fin.twig', {'user' : finPartie['user']});
		  else
			res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});  
      }
  }
  
  if(req.method=='POST')
  {
	  req.session.name='';
	  req.session.login='';
	  req.session.pass='';
	  req.session.score=0;
	  var it = 100;
	  crypto.pbkdf2(req.body['pass'],sel,it,128,'sha512',function(err,hash)
	  {
		db.query('select name,login,password,score from users where login=? and password=?', [req.body['login'],hash],
		function(err,rows)
		{
			if(!err && typeof rows[0] != "undefined")				
			{
				req.session.login = rows[0]['login'];
				req.session.pass = rows[0]['password'];
				req.session.name=rows[0]['name'];
				req.session.score=rows[0]['score'];
				user_conn.push(req.body['login']);
				score_user_conn.push(req.session.score);
				res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});
			}   
			else
				res.render('index.twig',{'result' : 0});
		});
    });
   }
});

app.post('/disconnect', function(req, res)
{
	var index = user_conn.indexOf(req.body['user']);
	db.query('Update users set score=? where login=?', [score_user_conn[index],user_conn[index]],
	function(err,rows)
	{
		if(err)
		   res.render('curiosity.twig',{'user_connect' : user_conn,'score_user_connect' : score_user_conn,ses : req.session});
		else
		{
			user_conn.splice(index,1);
			score_user_conn.splice(index,1);
			var json = JSON.stringify(
				{
					'user_connect' : user_conn,
					'score_user_connect' : score_user_conn,
					'action' : 'list',
					'tab' : tableau
					
				});
			wsserver.broadcast(json);
			req.session.login = '';
			req.session.pass = '';
			req.session.name = '';
			req.session.score = 0;
			res.render('index.twig');
		}
	});
});

server.listen(8080);
