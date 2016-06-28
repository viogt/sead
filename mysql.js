var http	= require('http'),
    fs		= require('fs'),
    ipadd	= process.env.OPENSHIFT_NODEJS_IP,
    port	= process.env.OPENSHIFT_NODEJS_PORT || 8080,
    body;


http.createServer(function (req, res) {

  if(req.method == 'GET') {
      if(req.url == '/') { returnFile('mysql.html', res); return; }
      if(req.url == '/favicon.ico') return;
      if(req.url.substr(0,4) == '/db/') { Query(decodeURIComponent(req.url.substr(4)), res); return; }
      if(req.url.substr(0,6) == '/json/') returnJSON(req.url.substr(6),res);
      return;
  }
  else {
    body = '';
  	req.on('data', function (chunk) { body += chunk; });
  	req.on('end', function () { Query(body, res); });
  	return;
  }

}).listen(port);
console.log('> MySQL app is running at port ' + port);

function returnFile(fn, res) {
    var file = fs.createReadStream(fn);
    file.on('error', function(e){ res.end('0Error reading file ' + fn) });
    file.pipe(res);
}

function returnJSON(fl, resp){
	fs.readFile(fl, function (err,data) {
	  if (err) {
		  resp.writeHead(200, {'Content-Type': 'text/plain' });
		  resp.end('0Error retreiving the file ' + fl + '...'); return;
	  }
	  resp.end(data);
  });
}

function Query(s, res) {
  try {

      var mysql = require("mysql");
      var con = mysql.createConnection({ host: "localhost", user: "root", password: "mysqllocal", database: "newDB"});
      //process.env.OPENSHIFT_MYSQL_DB_HOST
      //process.env.OPENSHIFT_MYSQL_DB_PORT
      //process.env.OPENSHIFT_MYSQL_DB_USERNAME
      //process.env.OPENSHIFT_MYSQL_DB_PASSWORD
      con.connect(function(err) {

          if(err){ console.log('0Error connecting to Db'); return; }
          console.log('Connected.');
          var j = JSON.parse(s);
          //console.log('SQL: ' + j.sql + '\n' + (j.values?j.values:[]).join(','));
  
          con.query(j.sql, j.values?j.values:[], function( err, rows ){

              if(err) { res.end('0Error executing exec. query: ' + j.sql + '\n' + err); kill(con); return; }
              if(j.sql.substr(0,6).toUpperCase() == 'SELECT') {
                  res.end((rows.length>0)?JSON.stringify( rows ):'NOT');
                  kill(con); return;
              }
              var R = rows.insertId || rows.changedRows || rows.affectedRows;
              res.end(R?R.toString():'NOT');
              kill(con); return;
          });
      });
  } catch(e) { res.end('0Internal error, ' + e.message); return; }
}

function kill(c) { c.end(function(err) { console.log(err?err:'Disconnected.'); }); }