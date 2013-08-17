
// TODO Handle errors in all ajax requests

/* Controllers */
function mainCtrl($scope, sharedHeader) {
    $scope.db = null;
    $scope.table = null;

    $scope.$on('pathUpdated', function() {
        $scope.db = sharedHeader.db;
        $scope.table = sharedHeader.table;
    });        
}
// Controller for the list of posts
function IndexCtrl($scope, $http, $routeParams, sharedHeader) {
    $scope.db = $routeParams.db
    sharedHeader.updatePath($scope);

    $scope.status = 'loading';

    // Get data
    $http.get('/api/databases/tables', {params: {db:$scope.db}}).
        success(function(data) {
            if (data.error != null) {
                $scope.status = 'error';
                h.handleError(data.error);
            }
            else {
                $scope.status = (data.databases.length === 0) ? 'empty': 'list';
                $scope.databases = data.databases;
            }
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

function AddDbCtrl($scope, $http, $location, sharedHeader) {
    sharedHeader.updatePath($scope);

    $scope.form = {}

    // Add an author
    $scope.createDb = function () {
        if ($scope.form.name == null) {
            $scope.error = true;
        }
        else {
            $scope.error = false;
            $http.post('/api/database/add', $scope.form).
            success(function(data) {
                if (data.error != null) {
                    h.handleError(data.error);
                }
                else if ((data.result != null) && (data.result.created != 1)) {
                    var error = new Error("The database could not be created")
                    h.handleError(error);
                }
                else {
                    $location.path('/msg/1');
                }
            });
        }
    };
}
function AddTableCtrl($scope, $http, $location, sharedHeader) {
    sharedHeader.updatePath($scope);

    $scope.form = {};
    $scope.status = 'loading';
    $http.get('/api/databases').
        success(function(data) {
            if (data.error != null) {
                $scope.status = 'error';
                h.handleError(data.error);
            }
            else {
                $scope.databases = data.databases;

                if (data.databases.length === 0) {
                    $scope.status = 'empty';
                }
                else {
                    $scope.status = 'ready';
                    $scope.form.database = data.databases[0];
                }
            }
        })
 
    // Create a table
    $scope.createTable = function () {
        $http.post('/api/table/add', $scope.form).
        success(function(data) {
            if (data.error != null) {
                h.handleError(data.error);
            }
            else if ((data.result != null) && (data.result.created != 1)) {
                h.handleError(new Error("Table not created, reason unknown"));
            }
            else {
                $location.path('/msg/2');
            }
        });
    };
}
function DeleteDbCtrl($scope, $http, $location, $routeParams, $window, sharedHeader) {
    //TODO Give focus
    $scope.db = $routeParams.db;
    sharedHeader.updatePath($scope);

    // Delete a database 
    $scope.deleteDb = function () {
        $http.post('/api/database/delete', {database: $scope.db}).
        success(function(data) {
            if (data.error != null) {
                h.handleError(data.error);
            }
            else if ((data.result != null) && (data.result.dropped != 1)) {
                h.handleError(new Error("Database not deleted, reason unknown"));
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

function DeleteTableCtrl($scope, $http, $location, $routeParams, $window, sharedHeader) {
    //TODO Give focus
    $scope.db = $routeParams.db
    $scope.table = $routeParams.table

    sharedHeader.updatePath($scope);

    // Delete a table
    $scope.deleteTable = function () {
        $http.post('/api/table/delete', {database: $scope.db, table: $scope.table}).
        success(function(data) {
            if (data.error != null) {
                h.handleError(data.error);
            }
            else if ((data.result != null) && (data.result.dropped != 1)) {
                h.handleError(new Error("Table not deleted, reason unknown"));
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

function TableCtrl($scope, $http, $location, $routeParams, $window, $route, sharedHeader) {
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
    sharedHeader.updatePath($scope);

    if (($scope.db == '') && ($scope.table === '')) {
        $location.path('/');
    }
    else if ($scope.table === '') {
        $location.path('/db/'+$scope.db);
    }

    $http.get('/api/table', {params: {db: $scope.db, table: $scope.table, skip: $scope.skip, limit: $scope.limit, order: $routeParams.order}}).
        success(function(data) {
            if (data.error != null) {
                $scope.status = 'error';
                h.handleError(data.error);
            }
            else if (data.noDoc === true) {
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

                $scope.primaryKey = data.primaryKey;

                $scope.order = $routeParams.order || $scope.primaryKey;
                $scope.more_data = data.more_data;

                $scope.status = 'list'
            }
        })

    $scope.renameFieldConfirm = function(index) {
        if (($scope.operation === 'rename') && ($scope.changeField === true)) {
            $scope.operation = null;
            $scope.changeField = false;
        }
        else {
            $scope.operation = 'rename';
            $scope.changeField = true;
            $scope.fieldToChangeStr = $scope.raw_fields[index].join('.')
            $scope.fieldToChange = $scope.raw_fields[index]
            setTimeout(function() { $('.newFieldName').focus() }, 0)
        }
    }
    $scope.renameField = function() {
        var data = {
            db: $scope.db,
            table: $scope.table,
            field: $scope.fieldToChange,
            newName: this.newFieldName
        }
        $http.post('/api/field/rename', data).
            success(function(data) {
                if (data.error != null) {
                    h.handleError(data.error);
                }
                else {
                    $route.reload();
                }
            })
    }

    $scope.deleteFieldConfirm = function(index) {
        if (($scope.operation === 'delete') && ($scope.changeField === true)) {
            $scope.operation = null;
            $scope.changeField = false;
        }
        else {
            $scope.operation = 'delete';
            $scope.changeField = true;
            $scope.fieldToChangeStr = $scope.raw_fields[index].join('.')
            $scope.fieldToChange = $scope.raw_fields[index]
        }
    }
    $scope.deleteField = function() {
        var data = {
            db: $scope.db,
            table: $scope.table,
            field: $scope.fieldToChange
        }
        $http.post('/api/field/delete', data).
            success(function(data) {
                if (data.error != null) {
                    h.handleError(data.error);
                }
                else {
                    $route.reload();
                }
            })
    }



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
                if (data.error != null) {
                    h.handleError(data.error);
                }
                else {
                    $route.reload();
                }
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
                if (data.error != null) {
                    h.handleError(data.error);
                }
                else {
                    $route.reload();
                }
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
        $scope.operation = null;
        $scope.changeField = null; 
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
        if ((typeof data === 'object') && (data != null) && (data.$reql_type$ === 'TIME')) {
            return h.dateToString(data)
        }
        else if (Object.prototype.toString.call(data) === '[object Object]') {
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

function AddDocCtrl($scope, $http, $location, $routeParams, $window, $route, sharedHeader) {
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

    sharedHeader.updatePath($scope);

    if (($scope.db == '') && ($scope.table === '')) {
        $location.path('/');
    }
    else if ($scope.table === '') {
        $location.path('/db/'+$scope.db);
    }

    $http.get('/api/table', {params: {db: $scope.db, table: $scope.table, sample: true}}).
        success(function(data) {
            if (data.error != null) {
                h.handleError(data.error);
            }
            else {
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
                                case 'date':
                                    var timezoneMin = (new Date()).getTimezoneOffset();
                                    var timezone = '';
                                    if (timezoneMin > 0) {
                                        timezone += '-';
                                    }
                                    else {
                                        timezone += '+';
                                    }
                                    if (timezoneMin/60 < 10) {
                                        timezone += '0'+timezoneMin/60;
                                    }
                                    else {
                                        timezone += ''+timezoneMin/60;
                                    }
                                    timezone += ':'
                                    if (timezoneMin%60 < 10) {
                                        timezone += '0'+timezoneMin%60;
                                    }
                                    else {
                                        timezone += ''+timezoneMin%60;
                                    }

                                    var newDate = {
                                        $reql_type$: 'TIME',
                                        epoch_time: Date.now()/1000,
                                        timezone: timezone 
                                    }
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], newDate)
                                    break;
                                case 'array':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], [])
                                    break;
                                case 'object':
                                    h.setValue($scope.newDoc, $scope.raw_fields[i], {})
                                    break;
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
            }
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
                if (data.error != null) {
                    h.handleError(data.error);
                }
                else {
                    $location.path('/table/'+$scope.db+'/'+$scope.table);
                    $route.reload();
                }
            });
    }
}

function ExportTableCtrl($scope, $http, $location, $routeParams, sharedHeader) {
    $scope.db = $routeParams.db;
    $scope.table = $routeParams.table;
    sharedHeader.updatePath($scope);

    $scope.export = function() {
        window.open('/api/export/table?db='+$scope.db+'&table='+$scope.table);
    }
    $scope.cancel = function() {
        $location.path('/table/'+$scope.db+'/'+$scope.table);
    }
}
function ImportTableCtrl($scope, $http, $location, $routeParams, sharedHeader) {
    $scope.db = $routeParams.db;
    $scope.table = $routeParams.table;
    sharedHeader.updatePath($scope);

    $scope.fileName = null;
    $scope.selectFile = function() {
        $('.real_file').click()
    }
    $scope.import = function() {
        if ($scope.file != null) {
            $scope.error = null;
            $http({
                method: 'POST',
                url: "/api/import/table",
                headers: { 'Content-Type': false },
                transformRequest: function (data) {
                    var formData = new FormData();
                    formData.append("db", $scope.db);
                    formData.append("table", $scope.table);
                    formData.append("file", $scope.file);
                    return formData;
                }
            }).
            success(function (data, status, headers, config) {
                if (data.error.length === 0) {
                    $location.path('/table/'+$scope.db+'/'+$scope.table);
                }
                // TODO Handle error
            })
        }
        else {
            $scope.error = 'empty'
        }
    }
    $scope.setFile = function(element) {
        $scope.$apply(function(scope) {
            $scope.fileName = element.files[0].name
            $scope.file = element.files[0]
        });
    };
    $scope.cancel = function() {
        $location.path('/table/'+$scope.db+'/'+$scope.table);
    }
}
function EmptyTableCtrl($scope, $http, $location, $routeParams, $window, sharedHeader) {
    //TODO Give focus
    $scope.db = $routeParams.db
    $scope.table = $routeParams.table
    sharedHeader.updatePath($scope);

    // Delete a table
    $scope.emptyTable = function () {
        $http.post('/api/table/empty', {database: $scope.db, table: $scope.table}).
        success(function(data) {
            if (data.error != null) {
                h.handleError(data.error);
            }
            else if ((data.result != null) && (data.result.errors != 0)) {
                h.handleError(new Error("Some documents have not been deleted."));
            }
            else {
                $location.path('/table/'+$scope.db+'/'+$scope.table);
            }
        });
    };

    $scope.home = function() {
        $window.history.back();
    }
}


 

// Helpers
var h = {};

// Keep it cool, it's not a real deep copy
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
h.getAttr = function(data, fields, raw) {
    var value = data;
    for(var i=0; i<fields.length; i++) {
        if (typeof value == 'object') {
            if (value === null) {
                if (i === fields.length-1) {
                    return value
                }
                else {
                    return undefined
                }
            }
            else if (raw !== 'raw' && value.$reql_type$ === 'TIME') {
                value = h.dateToString(value)
            }
            value = value[fields[i]]
        }
        else {
            return value
        }
    }

    if ((value != null) && (raw !== 'raw') && (value.$reql_type$ === 'TIME')) {
        return h.dateToString(value)
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
    } else if ((typeof value === 'object') && (value.$reql_type$ === 'TIME')) {
        return 'date'
    }
    return 'object'
}
h.getValidTypes = function(isPrimaryKey) {

    if (isPrimaryKey === true) {
        return ['undefined', 'string', 'number', 'date']
    }
    else {
        return ['undefined', 'null', 'boolean', 'string', 'number', 'date', 'array', 'object']
    }
}

h.retrieveDoc = function() {
    //TODO Enforce schema and throw
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
        else if (type === 'date') {
            var valueStr = $(field).find('.value').val();
            value = {
                $reql_type$: 'TIME',
                epoch_time: new Date(valueStr).getTime()/1000,
                timezone: /.*GMT([^\s]{5,6}).*/.exec(valueStr)[1]
            }
            h.setValue(newDoc, fieldPath, value);
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
        this.error = 'undefined';
    }
    else {
        // Prevent duplicate fields
        var foundDuplicate = false;
        for(var i=0; i<field.length; i++) {
            if (this.newField === field[i].field) {
                this.error = 'duplicate'
                foundDuplicate = true;
                break;
            }
        }
        // Good to go, let's add the field
        if (foundDuplicate === false) {
            field.push({
                field: this.newField,
                prefix: field[0].prefix
            })
            // Reset the new field
            this.newField = undefined;
            delete this.error;
        }
    }
}
h.handleError = function(error) {
    console.log('Error:')
    console.log(error);
    var newError = $("<div>", {class: "alert"});

    newError.html('Error:'+error.message);
    $('#error').append(newError);
    newError.fadeIn('fast')
    setTimeout( function() {
        newError.fadeOut('fast', function() { $(this).remove() })
    }, 2000)
}

h.dateToString = function(date) {
    var timezone, timezone_int;
    if (date.timezone != null) {
        timezone = date.timezone
        
        // Extract data from the timezone
        var timezone_array = date.timezone.split(':')
        var sign = timezone_array[0][0] // Keep the sign
        timezone_array[0] = timezone_array[0].slice(1) // Remove the sign

        // Save the timezone in minutes
        timezone_int = (parseInt(timezone_array[0])*60+parseInt(timezone_array[1]))*60
        if (sign === '-') {
            timezone_int = -1*timezone_int
        }
        // Add the user local timezone
        timezone_int += (new Date()).getTimezoneOffset()*60
    }
    else {
        timezone = '+00:00'
        timezone_int = (new Date()).getTimezoneOffset()*60
    }

    // Tweak epoch and create a date
    var raw_date_str = (new Date((date.epoch_time+timezone_int)*1000)).toString()

    // Remove the timezone and replace it with the good one
    return raw_date_str.slice(0, raw_date_str.indexOf('GMT')+3)+timezone

}
