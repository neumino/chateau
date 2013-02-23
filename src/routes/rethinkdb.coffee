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
