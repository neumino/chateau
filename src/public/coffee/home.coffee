#TODO This code looks like shit. I'll rewrite it later
#TODO We do not currently do things that ReQL does not supoort like acks/replications/rename
class HomeView extends Backbone.View
    id: 'content'
    className: 'home'
    template:
        main: Handlebars.templates['home-main']
        content: Handlebars.templates['home-content']
        error: Handlebars.templates['error']
        feedback: Handlebars.templates['feedback']
        add_something: Handlebars.templates['home-add_something']
        databases_options: Handlebars.templates['home-add_something-database_option']
    state: null #show_add_db, show_add_table
    add_something_view_changed: false
    events:
        'click .add_db': 'trigger_add_db'
        'click .add_table': 'trigger_add_table'
        'click .submit_new_database': 'create_new_database'
        'keypress #new_database_name': 'handle_keypress_new_database'
        'click .close': 'close_alert'
        'click .add_database_option_again': 'load_databases_for_new_table_and_prevent_default'
        'click .submit_new_table': 'create_new_table'
        'keypress #new_table_name': 'handle_keypress_new_table'
        'click .btn_delete_database': 'ask_confirmation_delete_database'
        'click .btn_delete_table': 'ask_confirmation_table_database'
        'click .close_add_something': 'close_add_something'

    initialize: (args) =>
        if args?.filter_db is true
            @filter_db = true
            @db_name = args.db
        else
            @filter_db = false

    close_alert: (event) =>
        event.preventDefault()
        @$(event.target).parent().slideUp 'fast', ->
            $(event.target).siblings('span').empty()
    
    render: =>
        @$el.html @template['main']
            filter_db: @filter_db
            db_name: @db_name
        @get_all()
        return @

    get_all: (callback_success) =>
        if not callback_success?
            callback_success = @ajax_success_get_all
        $.ajax
            url: "/rethinkdb/get_all"
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify
                id: window.id
            success: callback_success
            error: @ajax_fail_get_all

    ajax_success_get_all: (data) =>
        @show_all
            animation: true
            data: data

    ajax_success_get_all_no_animation: (data) =>
        @show_all
            animation: false
            data: data

    show_all: (args) =>
        animation = args.animation
        data = JSON.parse args.data
        that = @
        if @filter_db is true
            data = _.filter data, (db) -> return db.name is that.db_name

        # Save data
        @databases = data.sort(Helpers.prototype.sort_by_name)

        if data.length > 0
            @$('.no_content').slideUp 'fast', ->
                $(@).remove()
            if animation is true
                @$('.loading_container').slideUp 'fast', ->
                    $(@).remove()
                @$('.databases').append @template['content']
                    databases: data
                @$('.database_container').slideDown 'fast'
            else
                @$('.databases').html @template['content']
                    databases: data
                @$('.database_container').show()
        else
            if animation is true
                @$('.loading_container').slideUp 'fast', ->
                    $(@).remove()
                @$('.databases').append @template['content']
                    no_content: true
                @$('.no_content').slideDown 'fast'
            else
                @$('.databases').html @template['content']
                    no_content: true

        @delegateEvents()


    ajax_fail_get_all: =>
        @$('.loading_container').slideUp 'fast', ->
            $(@).remove()
        @$('.error').append @template['error']
            ajax: true
        @$('.error').slideDown 'fast'
        @delegateEvents()
        

    trigger_add_db: =>
        add_something_view_changed = true
        that = @
        if @state is 'show_add_db'
            @$('.add_something').slideUp 'fast'
            @$('.add_something').addClass 'add_something_db'
            @$('.add_something').removeClass 'add_something_table'
            @state = null
        else if @state is null
            @$('.add_something').html @template['add_something']
                new_db: true
            @$('.add_something').addClass 'add_something_db'
            @$('.add_something').removeClass 'add_something_table'
            @$('.add_something').slideDown 'fast'
            @state = 'show_add_db'
            @$('#new_database_name').focus()
        else if @state is 'show_add_table'
            @$('.add_something').slideUp 'fast', ->
                that.$('.add_something').html that.template['add_something']
                    new_db: true
                that.$('.add_something').addClass 'add_something_db'
                that.$('.add_something').removeClass 'add_something_table'

                $(@).slideDown 'fast', ->
                    that.$('#new_database_name').focus()
            @state = 'show_add_db'
        @delegateEvents()

    trigger_add_table: =>
        add_something_view_changed = true
        that = @
        if @state is 'show_add_table'
            @$('.add_something').slideUp 'fast'
            @$('.add_something').addClass 'add_something_table'
            @$('.add_something').removeClass 'add_something_db'
            @state = null
        else if @state is null
            @$('.add_something').html @template['add_something']
                new_table: true
            @$('.add_something').addClass 'add_something_table'
            @$('.add_something').removeClass 'add_something_db'
            @$('.add_something').slideDown 'fast', ->
                that.load_databases_for_new_table()
            @state = 'show_add_table'
            @$('#new_table_name').focus()
        else if @state is 'show_add_db'
            @$('.add_something').slideUp 'fast', ->
                that.$('.add_something').html that.template['add_something']
                    new_table: true
                that.$('.add_something').addClass 'add_something_table'
                that.$('.add_something').removeClass 'add_something_db'
                $(@).slideDown 'fast', ->
                    that.$('#new_table_name').focus()
                that.load_databases_for_new_table() # It would be too much sweat to start it before
            @state = 'show_add_table'
        @delegateEvents()

    close_add_something: (event) =>
        event.preventDefault()
        @$('.add_something').slideUp 'fast'
        @$('.add_something').addClass 'add_something_table'
        @$('.add_something').removeClass 'add_something_db'
        @state = null


    create_new_database: =>
        name = @$('#new_database_name').val()
        if name is ''
            @$('.error_create_content').html @template['error']
                db_name_empty: true
            @$('.error_create').slideDown 'fast'
            return 1
        @$('.btn').prop 'disabled', 'disabled'
        @add_something_view_changed = false
        $.ajax
            url: "/rethinkdb/create_database"
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify
                id: window.id
                name: name
            success: @ajax_success_create_database
            error: @ajax_fail_create
    handle_keypress_new_database: (event) =>
        if event?.which is 13
            @create_new_database()

    ajax_fail_create: =>
        @$('.error_create').hide()
        @$('.btn').removeProp 'disabled'
        if @add_something_view_changed is false
            @$('.error_create_content').html @template['error']
                ajax_fail: true
            @$('.error_create').slideDown 'fast'

    ajax_success_create_database: (data) =>
        data = JSON.parse data

        @$('.error_create').hide()

        @$('.btn').removeProp 'disabled'
        if data.status is 'ok'
            if @add_something_view_changed is false
                @$('.feedback_create_content').html @template['feedback']
                    new_database: true
                @$('.feedback_create').css 'display', 'inline-block'
                @$('.add_something').slideUp 'fast'
                @state = null
            @get_all @ajax_success_get_all_no_animation
        else if data.status is 'fail'
            @$('.error_create_content').html @template['error']
                server_error: true
                error: JSON.stringify(data.error, null, 2).replace(/\\n/g, '\n').replace(/\\t/g, ' ')
            @$('.error_create').slideDown 'fast'

    load_databases_for_new_table_and_prevent_default: (event) =>
        event.preventDefault()
        @load_databases_for_new_table()
    load_databases_for_new_table: =>
        @$('.next_to_select').show()
        $.ajax
            url: "/rethinkdb/get_databases"
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify
                id: window.id
            success: @add_database_options
            error: @ajax_fail_get_databases

    add_database_options: (data) =>
        data = JSON.parse(data).sort(Helpers.prototype.sort_by_name)
        if data.length > 0
            @$('.database_selected').html @template['databases_options'] data
            @$('.database_selected').removeProp 'disabled'
            @$('.next_to_select').hide()
            @$('.submit_new_table').removeProp 'disabled'
        else
            @$('.next_to_select').hide()
            @$('.error_create').append @template['error']
                need_a_database_first: true
            @$('.error_create').slideDown 'fast'
            @delegateEvents()


    ajax_fail_get_databases: =>
        @$('.next_to_select').hide()
        @$('.error_create').append @template['error']
            ajax_fail_try_load_databases: true
        @$('.error_create').slideDown 'fast'
        @delegateEvents()
    
    create_new_table: =>
        name = @$('#new_table_name').val()
        db = @$('#database_selected').val()
        if name is ''
            @$('.error_create_content').html @template['error']
                table_name_empty: true
            @$('.error_create').slideDown 'fast'
            return 1
        @$('.btn').prop 'disabled', 'disabled'
        @add_something_view_changed = false
        $.ajax
            url: "/rethinkdb/create_table"
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify
                id: window.id
                name: name
                db: db
            success: @ajax_success_create_database
            error: @ajax_fail_create

    handle_keypress_new_table: (event) =>
        if event?.which is 13
            @create_new_table()

    ajax_fail_create: =>
        @$('.error_create').hide()
        @$('.btn').removeProp 'disabled'
        if @add_something_view_changed is false
            @$('.error_create_content').html @template['error']
                ajax_fail: true
            @$('.error_create').slideDown 'fast'

    ajax_success_create_database: (data) =>
        data = JSON.parse data

        @$('.error_create').hide()

        @$('.btn').removeProp 'disabled'
        if data.status is 'ok'
            if @add_something_view_changed is false
                @$('.feedback_create_content').html @template['feedback']
                    new_table: true
                @$('.feedback_create').css 'display', 'inline-block'
                @$('.add_something').slideUp 'fast'
                @state = null
            @get_all @ajax_success_get_all_no_animation
        else if data.status is 'fail'
            @$('.error_create_content').html @template['error']
                server_error: true
                error: JSON.stringify(data.error, null, 2).replace(/\\n/g, '\n').replace(/\\t/g, ' ')
            @$('.error_create').slideDown 'fast'


    ask_confirmation_delete_database: (event) =>
        root = @$(event.target)
        if event.target.className is 'icon-remove-circle'
            root = root.parent()

        if @delete_view?
            @delete_view.$el.slideUp 'fast'
            if @last_root?[0] isnt root?[0]
                @show_confirmation root, 'db'
            else @delete_view = null
        else
            @show_confirmation root, 'db'

    show_confirmation: (root, type) =>
        @delete_view = new DeleteView
            type: type
            container: @
            name: root.data('name')
            database: (root.data('database') if type is 'table')
        @last_root = root
        root.parent().siblings('.delete_something_container').html @delete_view.render().$el
        @delete_view.$el.slideDown 'fast'
        @delete_view.give_focus()

    ask_confirmation_table_database: (event) =>
        root = @$(event.target)
        if event.target.className is 'icon-remove-circle'
            root = root.parent()

        if @delete_view?
            @delete_view.$el.slideUp 'fast'
            if @last_root?[0] isnt root?[0]
                @show_confirmation root, 'table'
            else @delete_view = null
        else
            @show_confirmation root, 'table'


    remove_delete_view: =>
        @delete_view = null
        
class DeleteView extends Backbone.View
    className: 'delete_something delete_something_db'
    template:
        main: Handlebars.templates['home-delete_warning']
        error: Handlebars.templates['home-error']
        feedback: Handlebars.templates['feedback']
    add_something_view_changed: false
    events:
        'click .btn_confirm_delete':'handle_click'
        'keypress .confirm_name':'handle_keypress'
        'click .close_delete_something': 'close_all'

    initialize: (args) ->
        @type = args.type
        @container = args.container
        @name = args.name
        if @type is 'table'
            @database = args.database

    give_focus: =>
        @$('.confirm_name').focus()

    close_all: (event) =>
        event.preventDefault()
        that = @
        @$el.slideUp 'fast', ->
            that.container.remove_delete_view()

    render: =>
        @$el.html @template['main']
            delete_db: @type is 'db'
            delete_table: @type is 'table'
            name: @name
            database: (@database if @type is 'table')
        return @

    handle_keypress: (event) =>
        if event?.which is 13
            event.preventDefault()
            @deletion_confirmed()

    handle_click: (event) =>
        @deletion_confirmed()

    deletion_confirmed: (database) =>
        if @$('.confirm_name').val() isnt @$('.confirm_name').data('name')
            @wrong_name()
            return 1
        @$('.btn_confirm_delete').prop 'disabled', 'disabled'
        if @type is 'db'
            url = '/rethinkdb/delete_database'
            data =
                id: window.id
                database: @$('.confirm_name').val()
        else if @type is 'table'
            url = '/rethinkdb/delete_table'
            data =
                id: window.id
                database: @database
                table: @$('.confirm_name').data('name')
        $.ajax
            url: url
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify data
            success: @ajax_success_delete_database
            error: @ajax_fail_delete

    wrong_name: =>
        @$('.error_content').html @template['error']
            wrong_db_name: @type is 'db'
            wrong_table_name: @type is 'table'
        @$('.error').slideDown 'fast'

    ajax_fail_delete: =>
        @$('.error').hide()
        @$('.btn_confirm_delete').removeProp 'disabled'
        @$('.error_content').html @template['error']
            ajax_fail: true
        @$('.error').slideDown 'fast'

    ajax_success_delete_database: (data) =>
        data = JSON.parse data

        @$('.error_create').hide()

        @$('.btn_confirm_delete').removeProp 'disabled'
        if data.status is 'ok'
            @container.$('.feedback_create_content').html @template['feedback']
                delete_database: @type is 'db'
                delete_table: @type is 'table'
            @container.$('.feedback_create').css 'display', 'inline-block' # TODO Put a slideDown and make things float
            @$el.slideUp 'fast'
            @container.get_all @container.ajax_success_get_all_no_animation
        else if data.status is 'fail'
            @$('.error_content').html @template['error']
                server_error: true
                error: JSON.stringify(data.error, null, 2).replace(/\\n/g, '\n').replace(/\\t/g, ' ')
            @$('.error').slideDown 'fast'

