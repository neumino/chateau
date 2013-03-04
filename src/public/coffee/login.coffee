class LoginView extends Backbone.View
    id: 'content'
    className: 'login'
    template:
        list_tables: Handlebars.templates['dashboard-list_tables']
        list_tables_content: Handlebars.templates['dashboard-list_tables-content']
        login: Handlebars.templates['dashboard-login']
        login_error: Handlebars.templates['error']
        checking: Handlebars.templates['dashboard-checking']
    events:
        'click .save_config': 'save_config'
        'keypress input': 'handle_keypress'
        'click .continue_without_saving_link': 'render'

    initialize: =>
        @server = window.server
        @is_integer = Helpers.prototype.is_integer

    render: (args) =>
        if args?
            if args.checking is true
                @$el.html @template['checking']
            else if args.error?
                @$el.html @template['login']
                    error: @template['login_error'] args.error
                    host: @server.host
                    port: @server.port
                    http_port: @server.http_port
        else
            @$el.html @template['login']
        return @

    handle_keypress: (event) =>
        if event.which is 13
            @save_config()

    save_config: =>
        @$('.save_config').prop 'disabled', 'disabled'
        @$('.loading').show()

        errors = []

        host = @$('#config-host').val()
        host = if host is '' then 'localhost' else host
        port = @$('#config-port').val()
        if port is ''
            port = 28015
        else if @is_integer(port) is true
            port = parseInt port
        else
            errors.push 'port'
        http_port = @$('#config-http_port').val()
        if http_port is ''
            http_port = 8080
        else if @is_integer(http_port) is true
            http_port = parseInt http_port
        else
            errors.push 'http_port'
    
        if errors.length > 0
            if errors.length is 1
                if errors[0] is 'port'
                    @show_error
                        port_non_integer: true
                else if errors[0] is 'http_port'
                    @show_error
                        http_port_non_integer: true
            else
                @show_error
                    both_port_non_integer: true
            return 1

        @server_not_yet_valid =
            host: host
            port: port
            http_port: http_port

        $.ajax
            url: "/config/create"
            type: 'POST'
            contentType: 'application/json'
            data: JSON.stringify
                host: host
                port: port
                http_port: http_port
                id: window.id
            success: @ajax_success
            error: @ajax_fail

    save_server: =>
        @server = @server_not_yet_valid
        window.server = @server

    show_error: (error) =>
        @$('.loading').hide()
        @$('.error').html @template['login_error'] error
        @$('.error').slideDown 'fast'

    ajax_success: (data) =>
        data = JSON.parse data
        @$('.save_config').removeProp 'disabled', 'disabled'
        if data.connection_rdb is 'ok'
            if data.connection_http is 'ok'
                if data.save_file is 'ok'
                    @hide_error()
                    @save_server()
                    @semilattice =
                        tables = data.tables
                    router.connected = true
                    window.router.navigate 'home', {trigger: true}
                else
                    @hide_error()
                    @save_server()
                    @semilattice =
                        tables = data.tables
                    @show_error
                        save_file_fail: true
            else if data.connection_http is 'fail'
                @hide_error()
                @show_error
                    connection_http_fail: true
        else
            @hide_error()
            @show_error
                connection_rdb_fail: true

    ajax_fail: =>
        @$('.save_config').removeProp 'disabled', 'disabled'
        @show_error
            ajax_fail: true
    
    hide_error: =>
        @$('.error').hide()


    # Load tables
    load_tables: =>
        @$('.loading').show()
        $.ajax
            url: "/rethinkdb/get_tables"
            type: 'GET'
            data: JSON.stringify
                id: window.id
            contentType: 'application/json'
            success: @ajax_success_get_tables
            error: @ajax_fail_get_tables

    ajax_fail_get_tables: =>
        @show_error
            ajax_fail: true

    ajax_success_get_tables: (data) =>
        @$('.databases').html @template['list_tables_content'] data
