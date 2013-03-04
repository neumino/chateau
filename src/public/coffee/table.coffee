class TableView extends Backbone.View
    id: 'content'
    className: 'table_view'
    template:
        main: Handlebars.templates['table-main']
        tr: Handlebars.templates['table-tr']
        no_doc: Handlebars.templates['table-no_doc']
        options: Handlebars.templates['table-options']
        error: Handlebars.templates['error']
        feedback: Handlebars.templates['feedback']
        td: Handlebars.templates['table-td']

     events:
        'click .show_row': 'show_row'
        'click .btn_add_document': 'show_add_document'
        'click .close': 'close_alert'

    initialize: (args) =>
        @db_name = args.db_name
        @table_name = args.table_name

        @skip_value = 0
        @get_documents() # SPARTAAAA

        @callbacks_on_resize = {}
        @callbacks_on_scroll = {}
        @keys = {}

        @new_document_view = new NewDocumentView
            table_name: @table_name
            db_name: @db_name
            container: @

    render: =>
        #TODO Fix this shit!!!
        that = @
        @$el.html @template['main']
            db_name: @db_name
            table_name: @table_name

        callback_resize_top_content = (e) ->
            width = $(window).width()-140
            if $(window).scrollLeft() >= 60
                width += 60
            else
                width += $(window).scrollLeft()
            that.$('.top_content').css 'width', width
        callback_resize_top_content()
        @callbacks_on_resize['top_content'] = callback_resize_top_content
        @bind_callbacks_on_resize()


        callback_scroll_top_content = (e) ->
            margin = $(window).scrollLeft()
            if margin < 60
                margin = 0
            else
                margin -= 60
            that.$('.top_content').css 'margin-left', margin
        callback_scroll_top_content()
        @callbacks_on_scroll['top_content'] = callback_scroll_top_content
        @bind_callbacks_on_scroll()

        return @

    close_alert: (event) =>
        event.preventDefault()
        @$(event.target).parent().slideUp 'fast', ->
            $(event.target).siblings('span').empty()

    handle_mousedown: (event) =>
        if @mousedown is true
            @mousedown = false
        else if @stop_propagation isnt true
            @col_resizing = @$(event.target).data('col')
            @start_width = @$(event.target).parent().width()
            @start_x = event.pageX
            @mouse_down = true
            $('body').toggleClass('resizing', true)
            $(window).mousemove @handle_mousemove
            $(window).mouseup @handle_mouseup
            @$('.options_document').addClass 'options_document_hidden'

    handle_mousemove: (event) =>
        if @mouse_down is true
            @resize_column @col_resizing, Math.max 5, @start_width-@start_x+event.pageX

    resize_column: (col, size) =>
        $('.col-'+col).css 'max-width', size
        $('.value-'+col).css 'max-width', size-16
        $('.col-'+col).css 'width', size
        $('.value-'+col).css 'width', size-16
        if size < 20
            $('.value-'+col).css 'padding-left', (size-5)+'px'
            $('.value-'+col).css 'visibility', 'hidden'
        else
            $('.value-'+col).css 'padding-left', '10px'
            $('.value-'+col).css 'visibility', 'visible'
        @toggle_options_document()

    handle_mouseup: (event) =>
        if @mouse_down is true
            @mouse_down = false
            $('body').toggleClass('resizing', false)
            @toggle_options_document()
            @$('.options_document').removeClass 'options_document_hidden'

    # Toggle its position
    toggle_options_document: =>
        table_width = 0
        $('.entry').first().children().each (i, element) ->
            table_width += $(element).outerWidth()
        if 60+30+table_width+132 > $(window).width()
            @$('.options_document').addClass 'options_document_fixed'
            @$('.options_document').removeClass 'options_document_float'
        else
            @$('.options_document').removeClass 'options_document_fixed'
            @$('.options_document').addClass 'options_document_float'


    get_documents: (args) =>
        order_by = args?.order_by

        $.ajax
            url: "/rethinkdb/get_documents"
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify
                id: window.id
                db_name: @db_name
                table_name: @table_name
                skip_value: @skip_value
            success: @ajax_success_get_documents
            error: @ajax_fail_get_documents

    ajax_success_get_documents: (data) =>
        data = JSON.parse data
        more_data = data.more_data
        results = data.results
        @primary_key = data.primary_key
        keys = {}
        that = @
        

        @$('.loading_container').slideUp 'fast'

        if data.results.length is 0
            @$('.content_container').html @template['no_doc']
            keys =
                keys: {}
                most_frequent_type: "object"
                object_count: 0
                occurence_count: 0
                occurrence_rebalanced: 0
                sorted_keys: [@primary_key]
                type:
                    object: 0
            keys['keys'] = {}
            keys['keys'][@primary_key] =
                is_primary_key: true
                most_frequent_type: "string"
                occurence_count: 0
                occurrence_rebalanced: Infinity
                primitive_value_count: 0
                type:
                    string: 0

        else
            # Let's do some work. We sort keys per average occurence, basically, the less holes, the more on the left
            # That's some serious shit I wrote at 4am...
            for result in results
                @build_map_keys
                    keys: keys
                    value: result

            @compute_occurrence_keys
                keys: keys
                results: results

            @build_most_frequent_type
                keys: keys

            for key, value of keys['keys']
                if key is @primary_key
                    value.occurrence_rebalanced = Infinity
                    value.is_primary_key = true
                    break

            @sort_keys
                keys: keys

            #TODO deal if a key just match {}
            @$('.content_container').empty()
            @$('.content_container').html @template['tr']
                primary_key_value: '' # Err, I'm too lazy to handle the case 0 == handle in handlebars
            @$('.entry').last().append @template['td']
                record_num: true
                value: '#'
                first: true
                col: 0

            @display_keys
                keys: keys
                prefix: ''
                col:
                    col: 1

            for result, i in results
                new_document_view = new DocumentView
                    keys: keys
                    result: result
                    index: @skip_value+i+1
                    primary_key: @primary_key
                    table_name: @table_name
                    db_name: @db_name
                    container: @
                @$('.content_container').append new_document_view.render().$el

            @$('.value_container').mousedown (e) -> e.stopPropagation()
            @$('.click_detector').mousedown @handle_mousedown
            @$('.value_container').each (index, element) ->
                $(element).css 'width', that.$(element).width()
                $(element).css 'max-width', that.$(element).width()
            @$('.value').each (index, element) ->
                that.$(element).css 'width', that.$(element).width()
                that.$(element).css 'max-width', that.$(element).width()

            @$('.entry').slice(1).append @template['options']()

            @$('.content_displayer').css 'display', 'none'
            @$('.content_displayer').css 'visibility', 'visible'

        @new_document_view.set_data
            keys: keys
            more_data: data.more_data

        @toggle_options_document()

        # Let's delay for a smoother result
        cb = ->
            @$('.content_displayer').slideDown 'fast'
        setTimeout cb, 10
        @delegateEvents()
    
    # TODO Cache stuff
    bind_callbacks_on_scroll: =>
        that = @
        $(document).scroll (e) ->
            for key, callback of that.callbacks_on_scroll
                callback()
    bind_callbacks_on_resize: =>
        that = @
        $(document).resize (e) ->
            for key, callback of that.callbacks_on_resize
                callback()



    stop_propagation: (even) ->
        if @mousedown isnt true
            @stop_propagation = true

    dont_stop_propagation: (even) ->
        @stop_propagation = false



    display_keys: (args) =>
        keys = args.keys
        prefix = args.prefix
        col = args.col

        last_entry = @$('.entry').last()
        if keys['keys']?
            for key in keys['sorted_keys']
                if prefix isnt ''
                    new_prefix = prefix+'.'+key
                else
                    new_prefix = key
                @display_keys
                    keys: keys['keys'][key]
                    prefix: new_prefix
                    col: col
        else # This is a primitive
            if keys['keys']?
                value = prefix+'.value'
            else
                value = prefix
            last_entry.append @template['td']
                attr: true
                value: value
                col: col.col
            col.col++

                    


    sort_keys: (args) =>
        keys = args.keys

        if keys['keys']?
            for key of keys['keys']
                @sort_keys
                    keys: keys['keys'][key]
            sorted_keys = []
            for key of keys['keys']
                sorted_keys.push key
            sorted_keys.sort (a, b) ->
                a_value = keys['keys'][a].occurrence_rebalanced
                b_value = keys['keys'][b].occurrence_rebalanced

                if a_value < b_value
                    return 1
                else if a_value > b_value
                    return -1
                else
                    a_key = a.toLowerCase()
                    b_key = b.toLowerCase()
                    if a_key < b_key
                        return -1
                    else if a_key > b_key
                        return 1
                    else
                        return 0

            keys['sorted_keys'] = sorted_keys

    build_most_frequent_type: (args) =>
        keys = args.keys
        map_type = keys.type

        if keys['keys']?
            for key of keys['keys']
                @build_most_frequent_type
                    keys: keys['keys'][key]

       
        max = -1
        most_frequent_type = null

        for type, value of map_type
            if value > max
                most_frequent_type = type
                max = value
        # We give priority to text
        if most_frequent_type is 'string' and map_type['text'] > 0
            most_frequent_type = 'text'
        keys['most_frequent_type'] = most_frequent_type


    compute_occurrence_keys: (args) =>
        keys = args.keys

        occurrence = 0
        if keys['keys']?
            for key of keys['keys']
                @compute_occurrence_keys
                    keys: keys['keys'][key]

            occurrence = 0
            count = 0
            if keys['primitive_value_count']?
                occurrence += keys['primitive_value_count']
                count++
            for key of keys['keys']
                occurrence += keys['keys'][key]['occurrence_rebalanced']
                count++
            occurrence /= count

            keys['occurrence_rebalanced'] = occurrence
        else
            keys['occurrence_rebalanced'] = keys['primitive_value_count']

    ###
    {
        primitive_value: <int>
        object: {
            key_0: {
                primitive_value: <int>
                object: {
                    key_0_1: {
                        primitive_value: <int> 
                        occurrence: <int>
                    }
                    key_0_2: {
                        primitive_value: <int> 
                        occurrence: <int>
                    }
                occurrence: <int>
                }
            key_1: {
                primitive_value: <int>
                object: {
                    key_1_1: {
                        primitive_value: <int> 
                        occurrence: <int>
                    }
                    key_1_2: {
                        primitive_value: <int> 
                        occurrence: <int>
                    }
                }
                occurrence: <int>
            }
        }
        occurrence: <int>
    }
    ###
    build_map_keys:(args) =>
        keys = args.keys
        value = args.value

        if jQuery.isPlainObject(value)
            for key, new_value of value
                if not keys['keys']
                    keys['keys'] = {}
                if not keys['keys'][key]?
                    keys['keys'][key] = {}
                @build_map_keys
                    keys: keys['keys'][key]
                    value: new_value
            if keys['object_count']?
                keys['object_count']++
            else
                keys['object_count'] = 1
        else
            if keys['primitive_value_count']?
                keys['primitive_value_count']++
            else
                keys['primitive_value_count'] = 1
        if not keys['occurence_count']?
            keys['occurence_count'] = 1
        else
            keys['occurence_count']++

        type = @typeof value
        if not keys['type']?
            keys['type'] = {}
        if not keys['type'][type]
            keys['type'][type] = 1
        else
            keys['type'][type]++

    typeof: (value) =>
        if value is undefined
            return 'undefined'
        else if value is null
            return 'null'
        else if typeof value is 'boolean'
            return 'boolean'
        else if typeof value is 'string'
            if value.search(/\n/) is -1
                return 'string'
            else
                return 'text'
        else if typeof value is 'number'
            return 'number'
        else if Object.prototype.toString.call(value) is '[object Array]'
            return 'array'
        else
            return 'object'
        
    ajax_fail_get_documents: =>
        @$('.loading_container').slideUp 'fast', ->
            $(@).remove()
        @$('.error').append @template['error']
            ajax: true
        @$('.error').slideDown 'fast'
        @delegateEvents()


    show_row: (event) =>
        event.preventDefault()

    show_add_document: (event) =>
        that = @
        if @new_document_view.display is true
            @new_document_view.display = false
            @$('.add_document').slideUp 'fast'
        else
            @$('.add_document').html @new_document_view.render().$el
            @$('.add_document').css 'width', $(window).width()-90-32
            @$('.add_document').slideDown 'fast'
            @new_document_view.delegateEvents()
            callback_move_form = (e) ->
                margin_left = $(window).scrollLeft()
                if margin_left > 60
                    that.$('.add_document').css 'margin-left', (margin-left-60)+'px'
                    that.$('.add_document').css 'width', $(window).width()-90-32+60+'px'
                else
                    that.$('.add_document').css 'margin-left', '0px'
                    that.$('.add_document').css 'width', ($(window).width()-90-32+margin_left)+'px'
            callback_move_form()
            @callbacks_on_scroll['new_document'] = callback_move_form


    success_add_result: (document) =>
        @$('.add_document').slideUp 'fast'
        @$('.feedback_add_content').html @template['feedback']
            success_add_document: true
            document: JSON.stringify(document, null, 2)
        @$('.feedback_add').slideDown 'fast'

    show_successful_delete: (args) =>
        @$('.feedback_add_content').html @template['feedback']
            success_delete_document: true
            primary_key_value: args.primary_key_value
        @$('.feedback_add').slideDown 'fast'

    show_successful_update: (args) =>
        @$('.feedback_add_content').html @template['feedback']
            success_update_document: true
            primary_key_value: args.primary_key_value
            new_document: JSON.stringify(args.new_document, null, 2)
        @$('.feedback_add').slideDown 'fast'

