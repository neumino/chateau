class DocumentView extends Backbone.View
    tagName: 'tr'
    className: 'entry'
    template:
        td: Handlebars.templates['table-td']
        
    events:
        'click .btn_delete_document': 'ask_confirmation_delete_document'
        'click .btn_update_document': 'ask_confirmation_update_document'

    initialize: (args) =>
        @keys = args.keys
        @result = args.result
        @index = args.index
        @primary_key = args.primary_key
        @table_name = args.table_name
        @db_name = args.db_name
        @container = args.container

        @document_delete_view = new DocumentDeleteView
        @document_update_view = new DocumentUpdateView
        @colspan = 1 # 1 for #

    bind_callbacks_on_document: =>
        $(document).scroll ->
            for key, callback of @callbacks_on_document
                callback()
        $(document).resize ->
            for key, callback of @callbacks_on_document
                callback()


    render: =>
        @$el.data
            primary_key_value: @result[@primary_key]

        @$el.append @template['td']
            record_num: true
            value: @index
            col: 0
        @display_result
            result: @result
            keys: @keys
            col:
                col: 1

        @document_delete_view.set_data
            colspan: @colspan
            primary_key_value: @result[@primary_key]
            table_name: @table_name
            db_name: @db_name
            container: @
            main_container: @container
        @document_update_view.set_data
            colspan: @colspan
            primary_key_value: @result[@primary_key]
            table_name: @table_name
            db_name: @db_name
            keys: @keys
            container: @
            main_container: @container
            result: @result

        return @


    display_result: (args) =>
        keys = args.keys
        result = args.result
        col = args.col


        if keys['keys']?
            for key in keys['sorted_keys']
                @display_result
                    keys: keys['keys'][key]
                    result: result[key] if result?
                    col: col
        else # if keys['primitive_value']?
            @colspan++
            @$el.append @template['td']
                value: result
                undefined: result is undefined
                null: result is null
                number: typeof result is 'number'
                string: typeof result is 'string'
                boolean: typeof result is 'boolean'
                array: Object.prototype.toString.call(result) is '[object Array]'
                col: col.col
            col.col++


    ask_confirmation_delete_document: (event) =>
        root = $(event.target)
        if event.target.className is 'icon-remove-circle'
            root = root.parent()
        root = root.parent().parent()

        if @document_delete_view.display is true
            @document_delete_view.slideUp()
        else
            root.after @document_delete_view.render().$el
            @document_delete_view.slideDown() # Because we are in a table, and that we like smooth stuff

    ask_confirmation_update_document: (event) =>
        root = $(event.target)
        if event.target.className is 'icon-edit'
            root = root.parent()
        root = root.parent().parent()

        if @document_update_view.display is true
            @document_update_view.slideUp()
        else
            root.after @document_update_view.render().$el
            @document_update_view.slideDown() # Because we are in a table, and that we like smooth stuff

class DocumentDeleteView extends Backbone.View
    tagName: 'tr'
    className: 'delete_document'
    events:
        'click .close_delete_document': 'close_delete_document'
        'click .btn_submit_confirm_delete': 'submit_delete_document'

    template:
        delete_doc: Handlebars.templates['table-delete_doc']
        error: Handlebars.templates['error']

    set_data: (args) =>
        @colspan = args.colspan
        @primary_key_value = args.primary_key_value
        @db_name = args.db_name
        @table_name = args.table_name
        @container = args.container
        @main_container = args.main_container

    render: =>
        @display = true
        @$el.html @template['delete_doc']
            colspan: @colspan
            primary_key_value: @primary_key_value
        @$('.delete_container').css 'max-width', ($(window).width()-150)+'px'
        #TODO Bind a callback on scroll and resize to set a max-width
        @delegateEvents()
        return @

    slideDown: =>
        @$('.delete_container').slideDown 'fast'

    slideUp: =>
        @display = false
        that = @
        @$('.delete_container').slideUp 'fast', ->
            that.$el.remove()

    close_delete_document: (event) =>
        event.preventDefault()
        @slideUp()

    submit_delete_document: (event) =>
        $.ajax
            url: "/rethinkdb/delete_document"
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify
                id: window.id
                db_name: @db_name
                table_name: @table_name
                primary_key_value: @primary_key_value
            success: @ajax_success_delete_document
            error: @ajax_fail_delete_document

    ajax_success_delete_document: (data) =>
        data = JSON.parse data
        if data?[0]?.deleted is 1
            @slideUp()
            @container.$el.slideUp 'fast'
            @main_container.show_successful_delete
                primary_key_value: @primary_key_value
        else
            @$('.error_add_document').append @template['error']
                server_error: true
                error: JSON.stringify(data, null, 2)


    ajax_fail_delete_document: =>
        @$('.error_content').append @template['error']
            ajax_fail: true



class DocumentUpdateView extends Backbone.View
    tagName: 'tr'
    className: 'update_document'
    events:
        'click .close_update_document': 'close_update_document'
        'click .btn_submit_confirm_update': 'submit_update_document'
        'change .field_type': 'field_type_has_changed'
        'click .btn_add_field': 'add_field'

    template:
        update_doc: Handlebars.templates['table-update_doc']
        error: Handlebars.templates['error']
        field: Handlebars.templates['add_document-field']
        field_input: Handlebars.templates['add_document-field_input']
        add_field: Handlebars.templates['add_document-add_field']

    set_data: (args) =>
        @colspan = args.colspan
        @primary_key_value = args.primary_key_value
        @db_name = args.db_name
        @table_name = args.table_name
        @container = args.container
        @main_container = args.main_container
        @keys = args.keys
        @result = args.result # TODO WTF is this variable name

    render: =>
        #TODO Bind a callback on scroll to set a max-width
        @display = true
        @$el.html @template['update_doc']
            colspan: @colspan
            primary_key_value: @primary_key_value
        @display_data
            keys: @keys
            prefix: []
            container: @$('.content')
            first_step: true


        @$('.update_container').css 'max-width', ($(window).width()-150)+'px'
        @delegateEvents()
        return @

    display_data: (args) =>
        keys = args.keys
        prefix = args.prefix
        container = args.container
        first_step = args.first_step

        if keys['most_frequent_type'] is 'object'
            if first_step isnt true
                template = @template['field']
                    attr: true
                    key_name: prefix
                    is_object: true
                template = $(template)
                new_container = template.children('.value')
                container.append template
            else
                new_container = container

            for key in keys['sorted_keys']
                prefix.push key
                @display_data
                    keys: keys['keys'][key]
                    prefix: prefix
                    container: new_container
                prefix.pop()
            new_container.append @template['add_field']()

        else
            # Save the primary key for later
            if keys['is_primary_key']
                @primary_key = prefix[prefix.length-1]
            type = keys['most_frequent_type']

            value = @result
            for var_prefix in prefix
                value = value?[var_prefix]
            type = @main_container.typeof value

            container.append @template['field']
                key_name: prefix[prefix.length-1] # If doesn't exist, ship it back in 30 days
                key_prefix: JSON.stringify(prefix.slice 0, prefix.length-1)
                primary_key_defined: keys['is_primary_key']
                is_undefined: type is 'undefined'
                is_null: type is 'null'
                is_boolean: type is 'boolean'
                is_string: type is 'string'
                is_text: type is 'text'
                is_number: type is 'number'
                is_array: type is 'array'
                is_object: type is 'object' # Should always be true here...
                value: value
                value_is_defined: value isnt undefined

    add_field: (event) =>
        root = $(event.target).parent().parent()
        if root.data('key_prefix')? and root.data('key_prefix') isnt ''
            prefix = root.data 'key_prefix'
        else
            prefix = []
        key = root.data 'key_name'
        if key?
            prefix.push key
        $(event.target).before @template['field']
            is_string: true
            key_prefix: JSON.stringify prefix


    slideDown: =>
        @$('.update_container').slideDown 'fast'

    slideUp: (callback) =>
        @display = false
        that = @
        @$('.update_container').slideUp 'fast', ->
            that.$el.remove()
            if callback?
                callback()

    close_update_document: (event) =>
        event.preventDefault()
        @slideUp()

    submit_update_document: (event) =>
        array = eval(array)
        array = eval(array)
        array = eval(array)
        fields = $(event.target).siblings('.fields_main_container').children('.field')
        new_document = {}
        errors = []
        
        callback = (index, element_raw) ->
            element = $(element_raw)
            if element.hasClass 'new_field'
                key_name = element.find('.undefined_key_name').val()
            else
                key_name = element.data('key_name')

            current_object = new_document
            type = element.children('.type_container').children('.field_type').val() # Do not sweat too much
            if type is 'object'
                old_document = new_document

                new_document = {}

                new_fields = element.children('.value').children('.field')
                new_fields.each callback

                old_document[key_name] = new_document
                new_document = old_document
            else
                value = element.children('.value').children('.field_value').val()
                switch type
                    #when 'undefined'
                    when 'number'
                        parsed_value = parseFloat value
                        if parsed_value isnt parsed_value
                            errors.push
                                key_name: key_name
                                type: 'invalid_number'
                        else
                            current_object[key_name] = parsed_value
                    when 'null'
                        current_object[key_name] = null
                    when 'boolean'
                        if value is 'true'
                            current_object[key_name] = true
                        else if valuue is 'false'
                            current_object[key_name] = false
                        #else # Error cannot be true
                    when 'string'
                        current_object[key_name] = value
                    when 'array'
                        current_object[key_name] = eval(value)


        fields.each callback

        if errors.length > 0
            @$('.error_add_document').empty()
            for error in errors
                #TODO Complete full name
                key_name_complete = error.key_name

                if error.type is 'invalid_number'
                    @$('.error_add_document').append @template['error']
                        key_name: key_name_complete
                        nan_value_found: true
                else if error.type is 'redundant_key'
                    @$('.error_add_document').append @template['error']
                        key_name: key_name_complete
                        redundant_key: true
            @$('.error_add_document').slideDown 'fast'
        else
            @new_document = new_document # Save

            $.ajax
                url: "/rethinkdb/update_document"
                contentType: 'application/json'
                type: 'POST'
                data: JSON.stringify
                    id: window.id
                    db_name: @db_name
                    table_name: @table_name
                    primary_key_value: @primary_key_value
                    new_document: new_document
                success: @ajax_success_update_document
                error: @ajax_fail_update_document

    ajax_success_update_document: (data) =>
        data = JSON.parse data
        that = @

        if data?[0]?.modified is 1
            @slideUp ->
                that.main_container.get_documents()
            @main_container.show_successful_update
                primary_key_value: @primary_key_value
                new_document: @new_document
        else
            @$('.error_add_document').append @template['error']
                server_error: true
                error: JSON.stringify(data, null, 2)


    ajax_fail_update_document: =>
        @$('.error_content').append @template['error']
            ajax_fail: true

    field_type_has_changed: (event) =>
        @$(event.target).parent().siblings('.value').remove()

        console.log $(event.target).data('is_primary_key')

        new_type = $(event.target).val()
        main_parent = @$(event.target).parent().parent()
        main_parent.append @template['field_input']
            key_name: main_parent.data('key_name')
            is_primary_key: $(event.tprget).data('is_primary_key') is true and new_type is 'undefined'
            is_undefined: new_type is 'undefined'
            is_null: new_type is 'null'
            is_boolean: new_type is 'boolean'
            is_string: new_type is 'string'
            is_text: new_type is 'text'
            is_number: new_type is 'number'
            is_array: new_type is 'array'
            is_object: new_type is 'object' # Should always be true here...
        if new_type is 'object'
            main_parent.find('.value').append @template['add_field']()
            @delegateEvents()
