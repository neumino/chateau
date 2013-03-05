fs = require 'fs'
util = require 'util'
$ = require 'jquery'
r = require 'rethinkdb'

exports.get_all = (req, res) =>
    id = req.body.id
    connection = shared_app_ref.connections[id]

    cursor = connection.run r.dbList(), {}
    cursor.collect (dbs_raw) ->
        if dbs_raw.length is 0
            res.send JSON.stringify []
            return 0

        dbs = {}
        for db in dbs_raw
            dbs[db] = []

        send_response = ->
            databases = []
            for db, tables of dbs
                databases.push
                    name: db
                    tables: tables
            res.send JSON.stringify databases

        create_callback = (db) ->
            callback = (tables) ->
                dbs[db] = tables
                db_listed++
                if db_listed is dbs_raw.length
                    send_response()

        db_listed = 0
        for db in dbs_raw
            callback = create_callback db
            cursor = connection.run r.db(db).tableList(), {}
            cursor.collect callback



exports.create_database = (req, res) =>
    id = req.body.id
    name = req.body.name
    connection = shared_app_ref.connections[id]

    cursor = connection.run r.dbCreate(name), {}
    cursor.collect (result) ->
        if result?.length is 0
            res.send JSON.stringify
                status: 'ok'
        else
            res.send JSON.stringify
                status: 'fail'
                error: result

exports.create_table = (req, res) =>
    id = req.body.id
    name = req.body.name
    db = req.body.db
    connection = shared_app_ref.connections[id]

    cursor = connection.run r.db(db).tableCreate(name), {}
    cursor.collect (result) ->
        if result?.length is 0
            res.send JSON.stringify
                status: 'ok'
        else
            res.send JSON.stringify
                status: 'fail'
                error: result


exports.get_databases = (req, res) =>
    id = req.body.id
    connection = shared_app_ref.connections[id]

    cursor = connection.run r.dbList(), {}
    cursor.collect (dbs_raw) ->
        if dbs_raw.length is 0
            res.send JSON.stringify []
            return 0

        result = []
        for db in dbs_raw
            result.push
                name: db

        res.send JSON.stringify result


exports.delete_database = (req, res) =>
    id = req.body.id
    database = req.body.database
    connection = shared_app_ref.connections[id]

    cursor = connection.run r.dbDrop(database), {}
    cursor.collect (result) ->
        if result?.length is 0
            res.send JSON.stringify
                status: 'ok'
        else
            res.send JSON.stringify
                status: 'fail'
                error: result


exports.delete_table = (req, res) =>
    id = req.body.id
    database = req.body.database
    table = req.body.table
    connection = shared_app_ref.connections[id]

    cursor = connection.run r.db(database).tableDrop(table), {}
    cursor.collect (result) ->
        if result?.length is 0
            res.send JSON.stringify
                status: 'ok'
        else
            res.send JSON.stringify
                status: 'fail'
                error: result
                
exports.get_documents = (req, res) =>
    id = req.body.id
    db_name = req.body.db_name
    table_name = req.body.table_name
    skip_value = req.body.skip_value
    order_by = req.body.order_by
    limit_value = 1000
    connection = shared_app_ref.connections[id]

    query = r.db(db_name).table(table_name)
    if order_by?
        query = query.orderBy(order_by)
    if skip_value? and skip_value isnt 0
        query = query.skip(skip_value)
    query = query.limit(limit_value+1)
    
    callback = (data)->
        primary_key = null
        for uuid, table of data
            if table?['name'] is table_name
                primary_key = table['primary_key']
                break
        if primary_key is null
            res.send JSON.stringify
                status: 'fail'
                error: 'no_primary_key'
        else
            execute_query
                query: query
                primary_key: primary_key
                connection: connection
                limit_value: limit_value
                res: res
                req: req
    $.ajax
        url: shared_app_ref.url
        success: callback
        error: ->
            res.send JSON.stringify
                status: 'fail'
                error: 'fail_to_retrieve_semilattice'

                    
execute_query = (args) ->
    query = args.query
    connection = args.connection
    primary_key = args.primary_key
    limit_value = args.limit_value
    req = args.req
    res = args.res

    cursor = connection.run query, {}
    results = []
    cursor.next (doc) ->
        if doc isnt undefined
            if results.length < limit_value
                results.push doc
            else
                res.send JSON.stringify
                    more_data: true
                    primary_key: primary_key
                    results: results
        else
            res.send JSON.stringify
                more_data: false
                primary_key: primary_key
                results: results


exports.add_document = (req, res) =>
    id = req.body.id
    db_name = req.body.db_name
    table_name = req.body.table_name
    new_document = req.body.new_document
    connection = shared_app_ref.connections[id]

    query = r.db(db_name).table(table_name).insert(new_document)
    cursor = connection.run query, {}
    cursor.collect (results) =>
        res.send JSON.stringify results

exports.update_document = (req, res) =>
    id = req.body.id
    db_name = req.body.db_name
    table_name = req.body.table_name
    new_document = req.body.new_document
    primary_key_value = req.body.primary_key_value
    connection = shared_app_ref.connections[id]

    query = r.db(db_name).table(table_name).get(primary_key_value).replace(new_document)
    cursor = connection.run query, {}
    cursor.collect (results) =>
        res.send JSON.stringify results

exports.delete_document = (req, res) =>
    id = req.body.id
    db_name = req.body.db_name
    table_name = req.body.table_name
    primary_key_value = req.body.primary_key_value
    connection = shared_app_ref.connections[id]

    query = r.db(db_name).table(table_name).get(primary_key_value).del()
    cursor = connection.run query, {}
    cursor.collect (results) =>
        res.send JSON.stringify results
