// Import
var express = require('express'),
    routes = require('./routes'),
    api = require('./routes/api');
    config = require('./config');


var app = module.exports = express();

// Configuration
app.configure(function(){
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.set('view options', {
        layout: false
    });
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);
});


app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// Home 
app.get('/', routes.index);
// Templates
app.get('/partials/:name', routes.partials);

// Get a list of databases and tables
app.get('/api/databases/tables', api.databasesAndTables);
// Add a database
app.post('/api/database/add', api.databaseAdd);
// Add a table
app.get('/api/databases', api.databases);
app.post('/api/table/add', api.tableAdd);
// Delete a database
app.post('/api/database/delete', api.databaseDelete);
// Delete a table 
app.post('/api/table/delete', api.tableDelete);

app.get('/api/table', api.table);
app.get('/api/table/:order/:skip/:limit', api.table);

app.post('/api/doc/delete', api.docDelete);
app.post('/api/doc/update', api.docUpdate);
app.post('/api/doc/insert', api.docInsert);



// Post API
app.get('/api/posts', api.posts);
app.get('/api/post/:id', api.post);
app.get('/api/post_and_authors/:id', api.postAndAuthors);
app.post('/api/post', api.addPost);
app.delete('/api/post/:id', api.deletePost);
app.put('/api/post/:id', api.editPost);

// Author API
app.get('/api/authors', api.authors);
app.get('/api/author/:id', api.author);
app.post('/api/author', api.addAuthor);
app.delete('/api/author/:id', api.deleteAuthor);
app.put('/api/author/:id', api.editAuthor);

// Comment API
app.post('/api/comment', api.addComment);
app.delete('/api/comment/:id', api.deleteComment);

// Redirect all others to the index
// A 404 page is probably a better move
app.get('*', routes.index);

// Start server
app.listen(config.expressPort, function(){
    console.log("Express server listening on port %d in %s mode", config.expressPort, app.settings.env);
});
