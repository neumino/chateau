class NewDocumentView extends Backbone.View
    className: 'add_document_content'
    template:
        add_document: Handlebars.templates['add_document']
        field: Handlebars.templates['add_document-field']
        field_input: Handlebars.templates['add_document-field_input']
        add_field: Handlebars.templates['add_document-add_field']
        error: Handlebars.templates['error']

    events:
        'click .close': 'close_alert'
        'click .close_add_document': 'close_add_document'
        'keypress textarea': 'expand_textarea'
        'keypress .field_value': 'expand_input'
        'keyup textarea': 'expand_textarea'
        'keyup .field_value': 'expand_input'
        'click .btn_add_field': 'add_field'
        'click .submit_add_document': 'submit_document'
        'change .field_type': 'field_type_has_changed'


    initialize: (args) =>
        @display = false
        @db_name = args.db_name
        @table_name = args.table_name
        @container = args.container

    render: =>
        @display = true
        for key_name, key of @keys['keys']
            if key.is_primary_key is true
                primary_key = key_name
                break
        @$el.html @template['add_document']
            id: primary_key
        @display_data
            keys: @keys
            prefix: []
            container: @$('.fields_container')
            first_step: true
        return @


    close_add_document: (event) =>
        event.preventDefault()
        @$el.parent().slideUp 'fast'
        @display = false

    close_alert: (event) =>
        event.preventDefault()
        @$(event.target).parent().slideUp 'fast', ->
            $(event.target).siblings('span').empty()


    set_data: (args) =>
        @keys = args.keys
        @more_data = args.more_data

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
            container.append @template['field']
                key_name: prefix[prefix.length-1] # If doesn't exist, ship it back in 30 days
                key_prefix: JSON.stringify(prefix.slice 0, prefix.length-1)
                is_primary_key: keys['is_primary_key']
                is_undefined: type is 'undefined'
                is_null: type is 'null'
                is_boolean: type is 'boolean'
                is_string: type is 'string'
                is_text: type is 'text'
                is_number: type is 'number'
                is_array: type is 'array'
                is_object: type is 'object' # Should always be true here...

    expand_textarea: (event) =>
        $(event.target).height 0
        height = $(event.target)[0].scrollHeight
        if $(event.target).hasClass('short_field') is true
            if height < 20
                height = 28
        else
            if height < 70
                height = 78
        $(event.target).height height-8

    expand_input: (event) =>
        $(event.target).width 0
        width = $(event.target)[0].scrollWidth
        if width < 500-12
            width = 500-12
        else
            width += 10
        $(event.target).width width

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

    submit_document: (event) =>
        fields = $(event.target).siblings('.fields_container').children('.field')
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
                        else if value is 'false'
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
                url: "/rethinkdb/add_document"
                contentType: 'application/json'
                type: 'POST'
                data: JSON.stringify
                    id: window.id
                    db_name: @db_name
                    table_name: @table_name
                    new_document: new_document
                success: @ajax_success_add_document
                error: @ajax_fail_add_document

    ajax_success_add_document: (data) =>
        data = JSON.parse data
        if data?[0]?.inserted is 1
            if data[0].generated_keys?[0]?
                @new_document[@primary_key] = data[0].generated_keys[0]

            @display = false
            @container.success_add_result
                document: @new_document
        else
            @$('.error_add_document').append @template['error']
                server_error: true
                error: JSON.stringify(data, null, 2)

        if @more_data isnt true
            @container.get_documents()

    ajax_fail_add_document: =>
        @$('.error_add_document').append @template['error']
            ajax_fail: true

    field_type_has_changed: (event) =>
        @$(event.target).parent().siblings('.value').remove()

        console.log $(event.target).data('is_primary_key')

        new_type = $(event.target).val()
        main_parent = @$(event.target).parent().parent()
        main_parent.append @template['field_input']
            key_name: main_parent.data('key_name')
            is_primary_key: $(event.target).data('is_primary_key') is true and new_type is 'undefined'
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
