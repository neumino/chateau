'use strict';

// TODO Handle errors in all ajax requests

/* Controllers */

// Controller for the list of posts
function IndexCtrl($scope, $http, $routeParams) {
    $scope.status = 'loading';

    // Get data
    $http.get('/api/databases/tables', {params: {db:$routeParams.db}}).
        success(function(data) {
            $scope.status = (data.databases.length === 0) ? 'empty': 'list';
            $scope.databases = data.databases;
        });

    if ($routeParams.msg != null) {
        switch($routeParams.msg) {
            case '1':
                $('.alert_content').html('Database successfully created.')
                break;
            case '2':
                $('.alert_content').html('Table successfully created.')
                break;
            case '3':
                $('.alert_content').html('Database successfully dropped.')
                break;
            case '4':
                $('.alert_content').html('Table successfully dropped.')
                break;
        }
        $('.alert').slideDown('fast');
    }

    $scope.hide = function (event) {
        $('.alert').slideUp('fast');
        event.preventDefault();
        event.stopPropagation();
    }
}

function AddDbCtrl($scope, $http, $location) {
    //TODO Give focus
    $scope.form = {}

    // Add an author
    $scope.createDb = function () {
        $http.post('/api/database/add', $scope.form).
        success(function(data) {
            if (data.error != null) {
                //TODO Handle
                console.log(data.error);
            }
            else if ((data.result != null) && (data.result.created != 1)) {
                //TODO Handle
                console.log(data.result);
            }
            else {
                $location.path('/msg/1');
            }
        });
    };
}
function AddTableCtrl($scope, $http, $location) {
    //TODO Give focus
    $scope.form = {}

    $http.get('/api/databases').
        success(function(data) {
            $scope.databases = data.databases;
        })
 
    // Add an author
    $scope.createTable = function () {
        // Test

        $http.post('/api/table/add', $scope.form).
        success(function(data) {
            if (data.error != null) {
                //TODO Handle
                console.log(data.error);
            }
            else if ((data.result != null) && (data.result.created != 1)) {
                //TODO Handle
                console.log(data.result);
            }
            else {
                $location.path('/msg/2');
            }
        });
    };
}
function DeleteDbCtrl($scope, $http, $location, $routeParams, $window) {
    //TODO Give focus
    $scope.database = $routeParams.database

    // Delete a database 
    $scope.deleteDb = function () {
        $http.post('/api/database/delete', {database: $scope.database}).
        success(function(data) {
            if (data.error != null) {
                //TODO Handle
                console.log(data.error);
            }
            else if ((data.result != null) && (data.result.dropped != 1)) {
                //TODO Handle
                console.log(data.result);
            }
            else {
                $location.path('/msg/3');
            }
        });
    };

    $scope.home = function() {
        $window.history.back();
    }
}

function DeleteTableCtrl($scope, $http, $location, $routeParams, $window) {
    //TODO Give focus
    $scope.database = $routeParams.database
    $scope.table = $routeParams.table

    // Delete a table
    $scope.deleteTable = function () {
        $http.post('/api/table/delete', {database: $scope.database, table: $scope.table}).
        success(function(data) {
            if (data.error != null) {
                //TODO Handle
                console.log(data.error);
            }
            else if ((data.result != null) && (data.result.dropped != 1)) {
                //TODO Handle
                console.log(data.result);
            }
            else {
                $location.path('/msg/4');
            }
        });
    };

    $scope.home = function() {
        $window.history.back();
    }
}

function TableCtrl($scope, $http, $location, $routeParams, $window, $route) {
    $scope.newType = 'undefined'; // Just to remove the empty select option
    $scope.deepCopy = h.deepCopy;
    $scope.goBack = function($event) {
        $event.preventDefault();
        $event.stopPropagation();
        h.goBack($window);
    }
    $scope.max = Math.max
    $scope.getValidTypes = h.getValidTypes;
    $scope.status = 'loading';
    $scope.skip= parseInt($routeParams.skip) || 0;
    $scope.limit= parseInt($routeParams.limit) || 100;

    $scope.db = $routeParams.db;
    $scope.table = $routeParams.table;
    if (($scope.db == '') && ($scope.table === '')) {
        $location.path('/');
    }
    else if ($scope.table === '') {
        $location.path('/db/'+$scope.db);
    }

    $http.get('/api/table', {params: {db: $scope.db, table: $scope.table, skip: $scope.skip, limit: $scope.limit, order: $routeParams.order}}).
        success(function(data) {
            if (data.noDoc === true) {
                $scope.status = 'empty'
            }
            else {
                // Save what we are going to display
                $scope.raw_fields = data.flattened_fields;
                $scope.flattenedTypes = data.flattenedTypes;
                $scope.nestedFields = data.nestedFields;

                $scope.fields = []
                for(var i=0; i<data.flattened_fields.length; i++) {
                    $scope.fields.push(data.flattened_fields[i].join('.'))
                }
                $scope.flattened_docs = flatten_docs(data.documents, data.flattened_fields)

                $scope.documents = data.documents;

                $scope.status = 'list'
                $scope.primaryKey = data.primaryKey;

                $scope.order = $routeParams.order || $scope.primaryKey;
                $scope.more_data = data.more_data;
            }
        })
    $scope.stopPropagation = function(event) {
        event.stopPropagation();
    }
    $scope.resize = function(col, event) {
        var padding = 28;
        var start_x = event.pageX;
        var original_width = $(event.target).parent().width()-padding;
        $('table.results').addClass('resizing');
        var onmousemove_fn = function(event) {
            var new_width = Math.max(5, original_width-start_x+event.pageX)
            $('.col-'+col).css('min-width', new_width);
            $('.col-'+col+' > div.value_container').css('min-width', new_width);
        }
        $(document).on('mousemove', onmousemove_fn);
        $(document).on('mouseup', function() {
            $(document).off('mousemove', onmousemove_fn);
            $('table.results').removeClass('resizing');
        });
    }

    $scope.deleteTrigger = function(index) {
        if ((index === $scope.display) && ($scope.operation === 'delete')) {
            $scope.display = null;
            $scope.operation = null 
        }
        else {
            $scope.display = index;
            $scope.operation = "delete"
        }
    }
    $scope.deleteDoc = function(index) {
        var data = {
            db: $scope.db,
            table: $scope.table,
            id: $scope.documents[index][$scope.primaryKey]
        }
        $http.post('/api/doc/delete', data).
            success(function(data) {
                // TODO Add a feedback
                $route.reload();
            })
    }

    $scope.updateTrigger = function(index) {
        if ((index === $scope.display) && ($scope.operation === 'update')) {
            $scope.display = null;
            $scope.operation = null;
        }
        else {
            $scope.display = index;
            $scope.operation = "update";
        }
        // TODO expand textarea
    }
    $scope.expandTextareaFromEvent = function(event) {
        expandTextarea(event.target)
    }
    function expandTextarea(element) {
        $(element).height(0)
        var height = $(element)[0].scrollHeight
        if (height < 20) {
            height = 28
        }
        $(element).height(height-8)
    }

    // Keep it cool, it's not a real deep copy

    $scope.deepCopy = h.deepCopy;
    $scope.changeNewDocFieldType = function(field) {
        h.changeNewDocFieldType(field, this.newType, $scope);
    }
    $scope.updateDoc = function() {
        var data = {
            db: $scope.db,
            table: $scope.table,
            primaryKey: $scope.primaryKey,
            doc: h.retrieveDoc()
        }
        $http.post('/api/doc/update/', data).
            success(function(data) {
                $route.reload();
            });
    }

    $scope.pushScope = function(doc, fields) {
        if (fields == null) {
            fields = $scope.nestedFields
        }
        //TODO Make a deep copy!!!
        $scope.newDoc = h.deepCopy(doc);
        $scope.newDocFields = h.deepCopy(fields);
    }
    $scope.addField = h.addField;
    $scope.cancel = function() {
        $scope.display = null;
        $scope.operation = null;
        $scope.newDoc = null;
    }

    $scope.addDoc = function(event) {
        $scope.display = -1;
        $scope.newDoc = {};
        for(var i=0; i<$scope.raw_fields.length;i++) {
            for(var j=0; j<$scope.raw_fields[i].length; j++) {
                if (j === $scope.raw_fields[i].length-1) {
                    try{
                    switch($scope.flattenedTypes[i]) {
                        case 'undefined':
                            h.setValue($scope.newDoc, $scope.raw_fields[i], undefined)
                            break;
                        case 'null':
                            h.setValue($scope.newDoc, $scope.raw_fields[i], null)
                            break;
                        case 'boolean':
                            h.setValue($scope.newDoc, $scope.raw_fields[i], true)
                            break;
                        case 'string':
                            h.setValue($scope.newDoc, $scope.raw_fields[i], '')
                            break;
                        case 'number':
                            h.setValue($scope.newDoc, $scope.raw_fields[i], 0)
                            break;
                        case 'array':
                            h.setValue($scope.newDoc, $scope.raw_fields[i], [])
                            break;
                        case 'object':
                            h.setValue($scope.newDoc, $scope.raw_fields[i], {})
                            break;
                    }
                    }
                    catch(err) {
                        console.log(err);
                    }
                }
                else {
                    if ($scope.newDoc[$scope.raw_fields[i][j]] === undefined) {
                        $scope.newDoc[$scope.raw_fields[i][j]] = {}
                    }
                }
            }
        }
        $scope.raw_fields; //keys
        $scope.flattenedTypes; //types

        event.preventDefault();
        event.stopPropagation();
    }

    
    var flatten_docs = function(docs, keys) {
        var result = [];
        for(var i=0; i<docs.length; i++) {
            var flattened_doc = [];
            for(var j=0; j<keys.length; j++) {
                var value = docs[i]
                for(var k=0; k<keys[j].length;k++) {
                    value = value[keys[j][k]];
                    if (value == null) {
                        break;
                    }
                }
                flattened_doc.push({
                    type: $scope.computeType(value),
                    value: stringify(value)
                }); 
            }
            result.push(flattened_doc)
        }
        return result;
    }
    $scope.computeType = h.computeType;
    $scope.formatValue = function(data) {
        if (Object.prototype.toString.call(data) === '[object Object]') {
            return 'object'
        }
        return data
    }
    $scope.join = function(data) {
        return data.join('.')
    }
    $scope.getAttr = h.getAttr;
    var stringify = function(value) {
        if (value === null) {
            return 'null'
        }
        else if (value === undefined) {
            return 'undefined'
        }
        return value
    }

    // Only for array of primitives
    var arrayEqual = function(ar1, ar2) { 
        if (ar1.length != ar2.length) {
            return false
        }
        for(var i=0; i<ar1.length; i++) {
            if (ar1[i] !== ar2[i]) {
                return false
            }
        }
        return true
    }

}

function AddDocCtrl($scope, $http, $location, $routeParams, $window, $route) {
    // Add some functions in the scope
    $scope.addField = h.addField;
    $scope.getValidTypes = h.getValidTypes;
    $scope.computeType = h.computeType;
    $scope.changeNewDocFieldType = function(field) {
        h.changeNewDocFieldType(field, this.newType, $scope);
    }
    $scope.getAttr = h.getAttr;
    $scope.deepCopy = h.deepCopy;
    $scope.newType = 'undefined'; // Just to remove the empty select option

    $scope.status = 'loading';
    $scope.db = $routeParams.db;
    $scope.table = $routeParams.table;

    if (($scope.db == '') && ($scope.table === '')) {
        $location.path('/');
    }
    else if ($scope.table === '') {
        $location.path('/db/'+$scope.db);
    }

    $http.get('/api/table', {params: {db: $scope.db, table: $scope.table, sample: true}}).
        success(function(data) {
            $scope.status = 'ready';

            $scope.flattenedTypes = data.flattenedTypes;
            $scope.nestedFields = data.nestedFields;

            $scope.fields = []
            for(var i=0; i<data.flattened_fields.length; i++) {
                $scope.fields.push(data.flattened_fields[i].join('.'))
            }

            $scope.documents = data.documents;


            $scope.raw_fields = data.flattened_fields;

            $scope.newDoc = {};
            for(var i=0; i<$scope.raw_fields.length;i++) {
                for(var j=0; j<$scope.raw_fields[i].length; j++) {
                    if (j === $scope.raw_fields[i].length-1) {
                        if (i === 0) { // Then j === 0 too since it's the primary key
                            // We set the primary key to undefined so RethinkDB will generate a UUID
                            $scope.flattenedTypes[i] = 'undefined'
                            continue;
                        }


                        try{ //TODO Do we still need this try/catch?
                            switch($scope.flattenedTypes[i]) {
                                case 'undefined':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], undefined)
                                    break;
                                case 'null':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], null)
                                    break;
                                case 'boolean':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], true)
                                    break;
                                case 'string':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], '')
                                    break;
                                case 'number':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], 0)
                                    break;
                                case 'array':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], [])
                                    break;
                                case 'object':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], {})
                                    break;
                            }
                        }
                        catch(err) {
                            console.log(err);
                        }

                    }
                    else {
                        if ($scope.newDoc[$scope.raw_fields[i][j]] === undefined) {
                            $scope.newDoc[$scope.raw_fields[i][j]] = {}
                        }
                    }
                }
            }
            $scope.newDocFields = h.deepCopy($scope.nestedFields);
        })

    $scope.pushScope = function(doc, fields) {
        if (fields == null) {
            fields = $scope.nestedFields
        }
        //TODO Make a deep copy!!!
        $scope.newDoc = h.deepCopy(doc);
        $scope.newDocFields = h.deepCopy(fields);
    }

    $scope.insertDoc = function() {
        var data = {
            db: $scope.db,
            table: $scope.table,
            doc: h.retrieveDoc()
        }
        $http.post('/api/doc/insert/', data).
            success(function(data) {
                $location.path('/table/'+$scope.db+'/'+$scope.table);
                $route.reload();
            });
    }
}

// Helpers
var h = {};
h.deepCopy = function(value) {
    if (typeof value === 'string') {
        return value
    }
    else if (typeof value === 'boolean') {
        return value
    }
    else if (typeof value === 'number') {
        return value
    }
    else if (value === null) {
        return null
    }
    else if (Object.prototype.toString.call(value) === '[object Array]') {
        var result = [];
        for(var i=0; i<value.length; i++) {
            result.push(h.deepCopy(value[i]))
        }
        return result
    }
    else {
        var result = {}
        for(var key in value) {
            if (value.hasOwnProperty(key)) {
                result[key] = h.deepCopy(value[key])
            }
        }
        return result
    }
}
h.getAttr = function(data, fields) {
    var value = data;
    for(var i=0; i<fields.length; i++) {
        if (typeof value == 'object') {
            if (value === null) {
                return value
            }
            value = value[fields[i]]
        }
        else {
            return value
        }
    }
    return value
}
h.changeNewDocFieldType = function(field, newType, $scope) {
    if (field[field.length-1] === null) {
        h.setValue($scope.newDoc, field, undefined)
    }
    switch(newType) {
        case 'undefined':
            h.setValue($scope.newDoc, field, undefined)
            break;
        case 'null':
            h.setValue($scope.newDoc, field, null)
            break;
        case 'boolean':
            h.setValue($scope.newDoc, field, true)
            break;
        case 'string':
            h.setValue($scope.newDoc, field, '')
            break;
        case 'number':
            h.setValue($scope.newDoc, field, 0)
            break;
        case 'array':
            h.setValue($scope.newDoc, field, [])
            break;
        case 'object':
            h.setValue($scope.newDoc, field, {})
            break;
    }
}

h.setValue = function(doc, fields, value) {
    var pathToValue = doc;
    for(var i=0; i<fields.length-1; i++) {
        pathToValue = pathToValue[fields[i]]
    }
    if (value === undefined) {
        delete pathToValue[fields[fields.length-1]]
    }
    else {
        pathToValue[fields[fields.length-1]] = value
    }
}
h.computeType = function(value) {
    if (value === undefined) {
        return 'undefined'
    } else if (value === null) { 
        return 'null'
    } else if (typeof value === 'boolean') {
        return 'boolean'
    } else if (typeof value === 'string') {
        return 'string'
    } else if (typeof value === 'number') {
        return 'number'
    } else if (Object.prototype.toString.call(value) === '[object Array]') {
        return 'array'
    }
    return 'object'
}
h.getValidTypes = function(isPrimaryKey) {

    if (isPrimaryKey === true) {
        return ['undefined', 'string', 'number']
    }
    else {
        return ['undefined', 'null', 'boolean', 'string', 'number', 'array', 'object']
    }
}

h.retrieveDoc = function() {
    var newDoc = {}
    $('.field').each( function(index, field) {
        var type = $(field).find('select.type').val();
        var fieldPath = $(field).children('.field_and_type_container').data('fields')
        if (type === 'undefined') {
            h.setValue(newDoc, fieldPath, undefined)
        }
        else if (type === 'null') {
            h.setValue(newDoc, fieldPath, null)
        }
        else if (type === 'boolean') {
            var value = $(field).find('.value').val() === 'true' ? true: false;
            h.setValue(newDoc, fieldPath, value)
        }
        else if (type === 'string') {
            h.setValue(newDoc, fieldPath, $(field).find('.value').val())
        }
        else if (type === 'number') {
            h.setValue(newDoc, fieldPath, parseFloat($(field).find('.value').val()))
        }
        else if (type === 'array') {
            h.setValue(newDoc, fieldPath, JSON.parse($(field).find('.value').val()))
        }
        else if (type === 'object') {
            h.setValue(newDoc, fieldPath, {})
        }
    })
    return newDoc;
}

h.goBack = function($window) {
    $window.history.back();
}

h.addField = function(field) {
    // AngularJS return undefined and not the empty string.
    if (this.newField === undefined) {
        this.error = true;
    }
    else {
        field.push({
            field: this.newField,
            prefix: field[0].prefix
        })
        // Reset the new field
        this.newField = undefined;
        this.error = false;
    }
}

