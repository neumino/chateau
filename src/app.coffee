express = require 'express'
routes = require './routes'
user = require './routes/user'
config = require './routes/config'
rethinkdb = require './routes/rethinkdb'
http = require 'http'
path = require 'path'

app = express()
app.connections = {}
`shared_app_ref = app`

app.configure ->
    app.set('port', process.env.PORT || 3000)
    app.set('views', __dirname + '/views')
    app.set('view engine', 'ejs')
    app.use(express.favicon())
    app.use(express.logger('dev'))
    app.use(express.bodyParser())
    app.use(express.methodOverride())
    app.use(express.cookieParser('your secret here'))
    app.use(express.session())
    app.use(app.router)
    app.use(require('stylus').middleware(__dirname + '/public'))
    app.use(express.static(path.join(__dirname, 'public')))
    app.use(express.bodyParser())


app.configure 'development', ->
    app.use(express.errorHandler())

app.get '/', routes.index
app.get '/config.js', config.config
app.post '/config/create', config.create
app.post '/config/check', config.check
app.post '/config/delete', config.delete
app.post '/rethinkdb/get_all', rethinkdb.get_all
app.post '/rethinkdb/create_database', rethinkdb.create_database
app.post '/rethinkdb/create_table', rethinkdb.create_table
app.post '/rethinkdb/get_databases', rethinkdb.get_databases
app.post '/rethinkdb/delete_database', rethinkdb.delete_database
app.post '/rethinkdb/delete_table', rethinkdb.delete_table
app.post '/rethinkdb/get_documents', rethinkdb.get_documents
app.post '/rethinkdb/add_document', rethinkdb.add_document
app.post '/rethinkdb/update_document', rethinkdb.update_document
app.post '/rethinkdb/delete_document', rethinkdb.delete_document
app.get '/users', user.list

http.createServer(app).listen app.get('port'), ->
    console.log("Express server listening on port " + app.get('port'))
