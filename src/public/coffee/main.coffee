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
   

$(document).ready ->
    window.id = Helpers.prototype.generate_uuid()
    Backbone.history.start()
    window.router = new Router
