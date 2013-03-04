class Helpers
    is_integer: (integer) =>
        integer_regex = /^[0-9]+$/
        return integer_regex.test integer

    generate_uuid: =>
        return @generate_uuid_component()+@generate_uuid_component()+"-"+@generate_uuid_component()+"-"+@generate_uuid_component()+"-"+@generate_uuid_component()+"-"+@generate_uuid_component()+@generate_uuid_component()+@generate_uuid_component()

    generate_uuid_component: ->
        (((1+Math.random())*0x10000)|0).toString(16).substring(1)

    sort_by_name: (a, b) ->
        a_name = a.name.toLowerCase()
        b_name = b.name.toLowerCase()
        if a_name> b_name
            return 1
        else if a_name < b_name
            return -1
        else
            return 0

Handlebars.registerHelper 'comma_separated_list', (array) ->
    result = ''
    for value, i in array
        result += Handlebars.templates['table-value_raw']
            undefined: value is undefined
            null: value is null
            number: typeof value is 'number'
            string: typeof value is 'string'
            boolean: typeof value is 'boolean'
            array: Object.prototype.toString.call(value) is '[object Array]'
            value: value
        if i isnt array.length-1
            result += ', '
    return new Handlebars.SafeString result

Handlebars.registerHelper 'print_safe', (str) ->
    return new Handlebars.SafeString str

Handlebars.registerHelper 'inject_template', (template_name, data) ->
    template = Handlebars.templates[template_name]
    return new Handlebars.SafeString template data

$(document).ready ->
    window.id = Helpers.prototype.generate_uuid()
    Backbone.history.start()
    window.router = new Router
