Handlebars.registerHelper 'comma_separated_list', (array) ->
    result = ''
    for value in array
        result += Handlebars.templates['table-value_raw']
    return Handlebars.SafeString result


class TableView extends Backbone.View
    id: 'content'
    className: 'table_view'
    template:
        main: Handlebars.templates['table-main']
        tr: Handlebars.templates['table-tr']
        td: Handlebars.templates['table-td']
        options: Handlebars.templates['table-options']

     events:
        'click .show_row': 'show_row'
        'click .btn_add_document': 'show_add_document'

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


    initialize: (args) =>
        @db_name = args.db_name
        @table_name = args.table_name

        @skip_value = 0
        @get_documents
            skip_value: @skip_value

        @callbacks_on_scroll = {}


    render: =>
        that = @
        @$el.html @template['main']
            db_name: @db_name
            table_name: @table_name

        @callbacks_on_scroll['new_document'] = (e) ->
            that.$('.options_document').css 'margin-top', (-1*$(@).scrollTop())+'px'
        @bind_callbacks_on_scroll()

        return @

    get_documents: (args) =>
        skip_value = args?.skip_value || 0
        order_by = args?.order_by

        $.ajax
            url: "/rethinkdb/get_documents"
            contentType: 'application/json'
            type: 'POST'
            data: JSON.stringify
                id: window.id
                db_name: @db_name
                table_name: @table_name
                skip_value: skip_value
            success: @ajax_success_get_documents
            error: @ajax_fail_get_documents

    ajax_success_get_documents: (data) =>
        data = JSON.parse data
        more_data = data.more_data
        results = data.results
        primary_key = data.primary_key
        keys = {}
        that = @

        @$('.loading_container').slideUp 'fast'

        # Let's do some work. We sort keys per average occurence, basically, the less holes, the more on the left
        for result in results
            @build_map_keys
                keys: keys
                result: result

        @compute_occurrence_keys
            keys: keys
            results: results

        #TODO Tweak primary key
        @sort_keys
            keys: keys
        #TODO deal if a key just match {}
        @$('.content_container').html @template['tr']()
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
            @$('.content_container').append @template['tr']()
            @$('.entry').last().append @template['td']
                record_num: true
                value: @skip_value+i+1
                col: 0
            @display_result
                result: result
                keys: keys
                col:
                    col: 1
        @$('.value_container').mousedown (e) -> e.stopPropagation()
        @$('.click_detector').mousedown @handle_mousedown
        @$('.value_container').each (index, element) ->
            $(element).css 'width', that.$(element).width()
            $(element).css 'max-width', that.$(element).width()
        @$('.value').each (index, element) ->
            that.$(element).css 'width', that.$(element).width()
            that.$(element).css 'max-width', that.$(element).width()

        @$('.entry').slice(1).append @template['options']()

        @callbacks_on_scroll['options_document'] = (e) ->
            that.$('.options_document').css 'margin-top', (-1*$(document).scrollTop())+'px'
        @bind_callbacks_on_scroll()

        @toggle_options_document()

        @delegateEvents()

    bind_callbacks_on_scroll: =>
        that = @
        $(document).scroll (e) ->
            for key, callback of that.callbacks_on_scroll
                callback()


    stop_propagation: (even) ->
        if @mousedown isnt true
            @stop_propagation = true

    dont_stop_propagation: (even) ->
        @stop_propagation = false


    display_result: (args) =>
        keys = args.keys
        result = args.result
        col = args.col

        last_entry = @$('.entry').last()
        if keys['primitive_value']?
            last_entry.append @template['td']
                value: result
                undefined: result is undefined
                null: result is null
                number: typeof result is 'number'
                string: typeof result is 'string'
                boolean: typeof result is 'boolean'
                array: Object.prototype.toString(result) is '[object Array]'
                col: col.col
            col.col++

        else if keys['object']?
            for key in keys['sorted_keys']
                @display_result
                    keys: keys['object'][key]
                    result: result[key]
                    col: col

    display_keys: (args) =>
        keys = args.keys
        prefix = args.prefix
        col = args.col

        last_entry = @$('.entry').last()
        if keys['primitive_value']?
            if keys['object']?
                value = prefix+'.value'
            else
                value = prefix
            last_entry.append @template['td']
                attr: true
                value: value
                col: col.col
            col.col++
        else if keys['object']?
            for key in keys['sorted_keys']
                if prefix isnt ''
                    new_prefix = prefix+'.'+key
                else
                    new_prefix = key
                @display_keys
                    keys: keys['object'][key]
                    prefix: new_prefix
                    col: col
                    


    sort_keys: (args) =>
        keys = args.keys

        if keys['object']?
            for key of keys['object']
                @sort_keys
                    keys: keys['object'][key]
            sorted_keys = []
            for key of keys['object']
                sorted_keys.push key
            sorted_keys.sort (a, b) ->
                a_value = keys['object'][a].occurrence
                b_value = keys['object'][b].occurrence

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



    compute_occurrence_keys: (args) =>
        keys = args.keys
        results = args.results

        occurrence = 0
        if keys['object']?
            for key of keys['object']
                @compute_occurrence_keys
                    keys: keys['object'][key]
                    results: results

            occurrence = 0
            count = 0
            if keys['primitive_value']?
                occurrence += keys['primitive_value']
                count++
            if occurrence isnt occurrence
                debugger
            for key of keys['object']
                occurrence += keys['object'][key]['occurrence']
                count++
                if occurrence isnt occurrence
                    debugger

            occurrence /= count
            if occurrence isnt occurrence
                debugger

            keys['occurrence'] = occurrence
        else
            keys['occurrence'] = keys['primitive_value']

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
        result = args.result

        if jQuery.isPlainObject(result)
            for key, value of result
                if not keys['object']
                    keys['object'] = {}
                if not keys['object'][key]?
                    keys['object'][key] = {}
                @build_map_keys
                    keys: keys['object'][key]
                    result: value
        else
            if keys['primitive_value']?
                keys['primitive_value']++
            else
                keys['primitive_value'] = 1
        
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
        #TODO
