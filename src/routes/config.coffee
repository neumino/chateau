fs = require 'fs'
util = require 'util'
$ = require 'jquery'
r = require 'rethinkdb'

exports.config = (req, res) ->
    fs.readFile 'config.json', 'utf8', (err,data) ->
        if (err)
            res.send 'window.server = null;'
            return util.log 'No config file found'
        shared_app_ref.server = JSON.parse data
        res.send "window.server = "+data



exports.create = (req, res) ->
    check_config
        host: req.body.host
        port: req.body.port
        http_port: req.body.http_port
        id: req.body.id
        res: res
        write_to_disk: true

exports.check = (req, res) ->
    check_config
        host: req.body.host
        port: req.body.port
        http_port: req.body.http_port
        id: req.body.id
        res: res
        write_to_disk: false

check_config = (args) ->
    host = args.host
    port = args.port
    http_port = args.http_port
    id = args.id
    res = args.res
    write_to_disk = args.write_to_disk

    success_semilattice = (data) ->
        server =
            host: host
            port: port
            http_port: http_port
        if write_to_disk is true
            fs.writeFile "config.json", JSON.stringify(server), (err) ->
                shared_app_ref.server = server
                if err
                    util.log err
                    res.send JSON.stringify
                        connection_rdb: 'ok'
                        connection_http: 'ok'
                        save_file: 'fail'
                        tables: data
                else
                    res.send JSON.stringify
                        connection_rdb: 'ok'
                        connection_http: 'ok'
                        save_file: 'ok'
                        tables: data
        else
            res.send JSON.stringify
                connection_rdb: 'ok'
                connection_http: 'ok'
                tables: data


    fail_semilattice = ->
        res.send JSON.stringify
            connection_rdb: 'ok'
            connection_http: 'fail'

    connection_successful_callback = (connection) ->
        shared_app_ref.connections[id] = connection
        if http_port isnt 80
            url = 'http://'+host+':'+http_port+'/ajax/semilattice/rdb_namespaces'
        else
            url = 'http://'+host+'/ajax/semilattice/rdb_namespaces'

        shared_app_ref.url = url
        $.ajax
            url: url
            success: success_semilattice
            error: fail_semilattice

    connection_failed_callback = ->
        res.send JSON.stringify
            connection_rdb: 'fail'

    r.connect {host: host, port: port}, connection_successful_callback, connection_failed_callback
