module.exports = function(config) {

    // Import
    var express = require('express'),
        routes = require('./routes'),
        api = require('./routes/api')(config);


    var app = module.exports = express();

    process.on('uncaughtException', function(err) {
        if(err.errno === 'EADDRINUSE') {
            console.log("Error: Port are already used by another process.\nYou can update config.js to use another port.")
        }
        else {
            throw err;
        }
        process.exit(1);
    })

    // Configuration
    app.configure(function(){
        app.set('views', __dirname + '/views');
        app.set('view engine', 'jade');
        app.set('view options', {
            layout: false
        });
        app.use(express.json());
        app.use(express.urlencoded());


        app.use(express.methodOverride());
        app.use(express.static(__dirname + '/public'));
        app.use(app.router);

        app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
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
    app.post('/api/table/empty', api.tableEmpty);

    app.get('/api/table', api.table);
    app.get('/api/table/list/:order/:skip/:limit', api.table);
    app.get('/api/export/table', api.exportTable);
    app.post('/api/import/table', api.importTable);

    app.post('/api/doc/delete', api.docDelete);
    app.post('/api/doc/update', api.docUpdate);
    app.post('/api/doc/insert', api.docInsert);

    app.post('/api/field/delete', api.fieldDelete);
    app.post('/api/field/rename', api.fieldRename);
    app.post('/api/field/add', api.fieldAdd);

    // Redirect all others to the index
    // A 404 page is probably a better move
    app.get('*', routes.index);

    // Start server
    app.listen(config.expressPort, config.network, function(){
        console.log("Express server listening on port %d", config.expressPort);
    });

}
