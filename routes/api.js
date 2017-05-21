module.exports = function(config) {
    var exports = {};

    // Import
    var r = require('rethinkdb'),
        Stream = require('stream'),
        fs = require('fs');


    var connection = null;
    function connect() {
        r.connect({
            host: config.host,
            port: config.port,
            authKey: config.authKey,
            user: config.user,
            password: config.password,
            ssl: config.ssl
        }, function(error, conn) {
            // Throws, if we don't have a connection, we won't do anything...
            if (error) throw error
            connection = conn;
        });
    }
    connect();

    function handleError(error) {
        if (config.debug === true) {
            console.log(error);
        }

        if ((error.name === 'RqlDriverError') && (error.msg === 'Connection is closed.')) {
            connect()
        }
    }

    exports.databasesAndTables = function (req, res) {
        if (req.query.db != null) {
            r.db(req.query.db).tableList().run( connection, {timeFormat: 'raw'}, function(error, tables) {
                if (error) handleError(error);
                res.json({
                    error: error,
                    dbs: [{
                        db: req.query.db,
                        tables: tables
                    }]
                });
            })
        }
        else {
            r.dbList().forEach(function(db) {
                return r.expr({
                    x: [{
                        db: db,
                        tables: r.db(db).tableList().orderBy(function(table) { return table })
                    }]
                })
            })('x').default([]) // If ('x') throws, it means there is no database
            .orderBy('database').run( connection, {timeFormat: 'raw'}, function(error, dbs) {
                if (error) handleError(error);
                res.json({
                    error: error,
                    dbs:dbs 
                });
            })
        }
    }
    exports.databaseAdd = function (req, res) {
        r.dbCreate(req.body.name).run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }
    exports.databases = function (req, res) {
        r.dbList().run( connection, {timeFormat: 'raw'}, function(error, dbs) {
            if (error) handleError(error);
            res.json({
                error: error,
                dbs: dbs 
            });
        })
    }
    exports.tableAdd = function (req, res) {
        var d = req.body;
        var pk = d.primaryKey || 'id'
        r.db(d.db).tableCreate(d.table, {primaryKey: pk}).run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }
    exports.databaseDelete = function (req, res) {
        var d = req.body;
        r.dbDrop(d.db).run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }
    exports.tableDelete = function (req, res) {
        var d = req.body;
        r.db(d.db).tableDrop(d.table).run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }
    exports.tableEmpty = function (req, res) {
        var d = req.body;
        r.db(d.db).table(d.table).delete().run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }


    exports.table = function (req, res) {
        // TODO clean code -- scope variables
        var db = req.query.db;
        var table = req.query.table;
        var skip = parseInt(req.query.skip) || 0;
        var limit = parseInt(req.query.limit) || 100;
        var sample = req.query.sample || false;
        var sample_size = 100; // TODO magic number.
        var maxCount = 9901; // We don't count more than one million
        var primaryKey;
        var indexes = {};
        var count;
        var query = r.db(db).table(table);
        if (sample === true) {
            query = query.sample(sample_size).run( connection, {timeFormat: 'raw'}, buildKeysResponse);
        }
        else {
            // Get primary key
            r.db(db).table(table).info().run( connection, {timeFormat: 'raw'}, function(error, info) {
                if (error) {
                    handleError(error);
                    res.json({
                        error: error
                    });
                }
                else {
                    primaryKey = info.primary_key;
                    indexes[primaryKey] = true;
                    for(var i=0; i<info.indexes.length; i++) {
                        indexes[info.indexes[i]] = true;
                    }
                    var order = req.query.order || primaryKey;
                    var ascDescValue = req.query.ascDescValue || 'asc';

                    // Get documents
                    query.skip(skip).limit(maxCount).count().run( connection, {timeFormat: 'raw'}, function(error, countResult) { count = countResult;
                        if (error) {
                            if (error) handleError(error);
                            res.json({
                                error: error
                            })
                        }
                        else if (count === 0) {
                            res.json({
                                error: null,
                                flattened_fields: [
                                    [primaryKey]
                                ],
                                nestedFields: [{
                                    field: primaryKey,
                                    prefix: [],
                                    isPrimaryKey: true
                                }],
                                flattenedTypes: ["string"],
                                documents: [],
                                noDoc: true,
                                primaryKey: primaryKey,
                                indexes: indexes,
                                more_data: "0",
                                count: skip
                            })
                        }
                        else {
                            var errorFound = false;
                            if (indexes[order] != null) {
                                if (ascDescValue === 'asc') {
                                    query = query.orderBy({index: order});
                                }
                                else {
                                    query = query.orderBy({index: r.desc(order)});
                                }
                            }
                            else {
                                if (count === maxCount) {
                                    errorFound = true;
                                    res.json({
                                        error: {
                                            message: "The table has more than "+(maxCount-1)+" elements and no index was found for "+order+"."
                                        }
                                    })
                                }
                                else if (ascDescValue === 'asc') {
                                    query = query.orderBy(order);
                                }
                                else {
                                    query = query.orderBy(r.desc(order));
                                }
                            }
                            if (errorFound === false) query.skip(skip).limit(limit+1).run( connection, {timeFormat: 'raw'}, buildKeysResponse);
                        }
                    })
                }
            })
        }

        // Callback that is going to compute the schema
        var buildKeysResponse = function(error, cursor) {
            if (error) {
                handleError(error)
                res.json({
                    error: error
                })
            }
            else {
                cursor.toArray( function(error, documents) {
                    var noDoc = false;
                    if (error) {
                        handleError(error);
                        res.json({
                            error: error
                        })
                    }
                    else if (documents.length === 0) {
                        res.json({
                            error: null,
                            flattened_fields: [
                                [primaryKey]
                            ],
                            nestedFields: [{
                                field: primaryKey,
                                prefix: [],
                                isPrimaryKey: true
                            }],
                            flattenedTypes: ["string"],
                            documents: [],
                            noDoc: true,
                            primaryKey: primaryKey,
                            indexes: indexes,
                            more_data: "0",
                            count: skip
                        })
                        return 0;
                    }
                    else {
                        // Clean, prepare docs
                        var keys= {};
                        for(var i=0; i<documents.length; i++) {
                            // For each docs, we update keys
                            buildMapKeys({ keys: keys, value: documents[i]})
                        }
                        // Compute the occurence ( = num primitives or average of all fields for objects)
                        computeOccurrenceKeys({ keys: keys, documents: documents});

                        // Compute the most frequent type (so we can suggest a schema)
                        buildMostFrequentType(keys);

                        // Tag the primary key
                        for(var key in keys['keys']) {
                            if (key === primaryKey) {
                                keys['keys'][key].occurrenceRebalanced = Infinity;
                                break;
                            }
                        }
                        
                        // Sort keys by occurence
                        sort_keys(keys);

                        // Flatten the keys so {obj: key: 1} => obj.key
                        var flattenedKeys = flattenKeys(keys, [], documents.length);

                        // Flatten types (used when the user wants to create a new document
                        var flattenedTypes = flattenTypes(flattenedKeys, keys);
                        
                        // Nested fields
                        var nestedFields = nestedKeys(keys);
                        nestedFields[0].isPrimaryKey = true // The first key is alweays the primary key

                        if (sample === true) {
                            res.json({
                                error: error,
                                flattened_fields: flattenedKeys,
                                nestedFields: nestedFields,
                                flattenedTypes: flattenedTypes,
                                documents: (noDoc === true) ? []: documents,
                                primaryKey: primaryKey
                            });
                        }
                        else {
                            // Is there more data?
                            var more_data = documents.length > limit;
                            if (more_data === true) {
                                documents = documents.slice(0, limit)
                            }

                            // We do not flatten documents because undefined is not a valid JSON type
                            res.json({
                                error: error,
                                flattened_fields: flattenedKeys,
                                nestedFields: nestedFields,
                                flattenedTypes: flattenedTypes,
                                documents: (noDoc === true) ? []: documents,
                                primaryKey: primaryKey,
                                indexes: indexes,
                                more_data: (more_data) ? '1': '0',
                                count: count+skip
                            });
                        }
                    }
                })
            }
        }
    }
    exports.exportTable = function (req, res) {
        var db = req.query.db;
        var table = req.query.table;

        var stream = new Stream();
        var init = true;
        stream.on('data', function(data) {
            res.write(data)
        })
        stream.on('close', function() {
            res.end()
        })
        res.attachment(db+'.'+table+'_'+(new Date()).toISOString()+'.json')



       
        r.db(db).table(table).run( connection, {timeFormat: 'raw'}, function(error, cursor) {
            if (error) {
                handleError(error);
            }
            else {
                stream.emit('data', '[')
                var fetchNext = function(err, row) {
                    if (err) {
                        stream.emit('data', ']')
                        stream.emit('close')
                    }
                    else {
                        if (init === true) {
                            stream.emit('data', JSON.stringify(row))
                            init = false;
                        }
                        else {
                            stream.emit('data', ','+JSON.stringify(row))
                        }
                        console.log(this)
                        cursor.next(fetchNext);
                    }
                }
                cursor.next(fetchNext)
            }
        })
    }
    exports.importTable = function (req, res) {
        //TODO Catch (where?) `Error: ENOSPC, write`
        var db = req.body.db;
        var table = req.body.table;

        var stream = fs.createReadStream(req.files.file.path, {
                flags: 'r',
                encoding: 'utf-8',
                fd: null
            });

        var parsingString = false; // Are we parsing a string?
        var delimiter = null; // Char delimiter for an started string
        var level = 0; // Level (we count the nested level)
        var bufferStr = ''; // Current string to parse as JSON
        var bufferAr = []; // Data to insert
        var queriesToDo = 0; // Queries to do
        var queriesDone = 0; // Queries done
        var doneParsing = false; // Done parsing?
        var errors = [] // Errors

        stream.addListener('readable', function() {
            var chunk;
            while (null !== (chunk = stream.read())) {
                console.log(chunk.length);
                for(var i=0; i<chunk.length; i++) {
                    var char = chunk[i];

                    if (char === "'") {
                        if (parsingString === false) {
                            parsingString = true;
                            delimiter = char;
                        }
                        else if ((bufferStr.length > 0) && (char === delimiter) && (bufferStr[bufferStr.length-1] !== "\\")) {
                            parsingString = false;
                        }

                    }
                    else if (char === '"') {
                        if (parsingString === false) {
                            parsingString = true;
                            delimiter = char;
                        }
                        else if ((bufferStr.length > 0) && (char === delimiter) && (bufferStr[bufferStr.length-1] !== "\\")) {
                            parsingString = false;
                        }
                    }

                    if ((parsingString === false) && ((level === 1) && (char === ','))) {
                        bufferAr.push(JSON.parse(bufferStr))
                        if (bufferAr.length > 500) {
                            queriesToDo++;
                            r.db(db).table(table).insert(bufferAr).run( connection, {timeFormat: 'raw'}, function(error, result) {
                                if (error) errors.push(error)
                                queriesDone++;
                                if ((doneParsing === true) && (queriesDone === queriesToDo)) {
                                    res.json({
                                        error: errors
                                    })
                                }
                            })
                            bufferAr = [];
                        }
                        bufferStr = '';
                    }
                    else {
                        if ((level !== 0) && (level !== 1 || char !== ']')) {
                            bufferStr += char;
                        }

                        if ((parsingString === false) && ((char === '{') || (char === '['))) {
                            level++;
                        }
                        else if ((parsingString === false) && ((char === '}') || (char === ']'))) {
                            level--;
                        }

                    }
                }
            }
            doneParsing = true;
            if (bufferAr.length > 0) {
                // Push the last element
                bufferAr.push(JSON.parse(bufferStr))

                queriesToDo++;
                r.db(db).table(table).insert(bufferAr).run( connection, {timeFormat: 'raw'}, function(error, result) {
                    if (error) errors.push(error)
                    queriesDone++;
                    if ((doneParsing === true) && (queriesDone === queriesToDo)) {
                        res.json({
                            error: errors
                        })
                    }
                })
                bufferAr = [];
            }

        })
    }


    exports.docDelete = function (req, res) {
        var db = req.body.db;
        var table = req.body.table;
        var id = req.body.id;
        r.db(db).table(table).get(id).delete().run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }

    exports.docUpdate = function (req, res) {
        var primaryKey = req.body.primaryKey;
        var db = req.body.db;
        var table = req.body.table;
        var doc = req.body.doc;
        r.db(db).table(table).get(doc[primaryKey]).replace(doc).run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }

    exports.docInsert = function (req, res) {
        var db = req.body.db;
        var table = req.body.table;
        var doc = req.body.doc;

        r.db(db).table(table).insert(doc).run( connection, {timeFormat: 'raw'}, function(error, result) {
            if (error) handleError(error);
            res.json({
                error: error,
                result: result
            });
        })
    }

    exports.fieldUpdate = function (req, res) {
        var db = req.body.db;
        var table = req.body.table;
        var field = req.body.field;
        var newName = req.body.newNae;
        var fieldObject = {};

        var ref = fieldObject;
        for(var i=0; i<field.length; i++) {
            if (i === field.length-1) {
                ref[field[i]] = true;
            }
            else {
                ref[field[i]] = {};
                ref = ref[field[i]];
            }
        }
        r.db(db).table(table).replace(function(doc) {
                var fieldObject = {}
                var ref = fieldObject;
                for(var i=0; i<field.length; i++) {
                    if (i === field.length-1) {
                        ref[field[i]] = true;
                    }
                    else {
                        ref[field[i]] = {};
                        ref = ref[field[i]];
                    }
                }
                       
                return doc.merge().without(fieldObject)
            }).run( connection, {timeFormat: 'raw'}, function(error, result) {
                if (error) handleError(error);
                res.json({
                    error: error,
                    result: result
                });
            })
    }


    exports.fieldDelete = function (req, res) {
        var db = req.body.db;
        var table = req.body.table;
        var field = req.body.field;
        var fieldObject = {};

        var ref = fieldObject;
        for(var i=0; i<field.length; i++) {
            if (i === field.length-1) {
                ref[field[i]] = true;
            }
            else {
                ref[field[i]] = {};
                ref = ref[field[i]];
            }
        }
        r.db(db).table(table).replace(function(doc) {
                return doc.without(fieldObject)
            }).run( connection, {timeFormat: 'raw'}, function(error, result) {
                if (error) handleError(error);
                res.json({
                    error: error,
                    result: result
                });
            })
    }
    exports.fieldAdd = function (req, res) {
        var db = req.body.db;
        var table = req.body.table;
        var path = req.body.name.split('.');
        var name = path[path.length-1];
        var error = null;

        var query = r.db(db).table(table);
        var updateDoc = {};
        var ref = updateDoc;
        for(var i=0; i<path.length-1; i++) {
            ref[path[i]] = {};
            ref = ref[path[i]];
        }

        types = ['string', 'number', 'boolean', 'date', 'null', 'arbitrary value', 'function'];
        switch(req.body.type) {
            case types[0]: //'string':
                ref[name] = req.body.value;
                query = query.update(updateDoc);
                break;
            case types[1]://'number':
                ref[name] = parseFloat(req.body.value);
                query = query.update(updateDoc);
                break;
            case types[2]://'boolean':
                ref[name] = (req.body.value === "true");
                query = query.update(updateDoc);
                break;
            case types[3]://'date':
                ref[name] = stringToDate( req.body.value );
                if ((typeof ref[name].epoch_time != 'number') || (ref[name] != ref[name])) {
                    error = "Could not parse date";
                }
                query = query.update(updateDoc);
                break;
            case types[4]://'null':
                ref[name] = null;
                query = query.update(updateDoc);
                break;
            case types[5]://'arbitrary value':
                // WTF?!
                ref[name] = eval('__var ='+req.body.value);
                query = query.update(updateDoc);
                break;
            case types[6]://'function':
                var fn = eval('('+req.body.value+')');
                query = query.update(fn);
                break;
        }
        if (error != null) {
            res.json({
                error: error,
                result: null
            });
        }
        else {
            query.run( connection, {timeFormat: 'raw'}, function(error, result) {
                if (error) handleError(error);
                res.json({
                    error: error,
                    result: result
                });
            })
        }
    }


    exports.fieldRename = function (req, res) {
        var db = req.body.db;
        var table = req.body.table;
        var field = req.body.field;
        var newName = req.body.newName;
        var fieldObject = {};

        r.db(db).table(table).replace(function(doc) {
                // Generate doc with doc(...) value
                var addFieldObject = {};
                var removeFieldObject = {};
                var refAdd = addFieldObject;
                var refRemove = removeFieldObject;
                var value = doc;

                for(var i=0; i<field.length; i++) {
                    if (i === field.length-1) {
                        refRemove[field[i]] = true;
                        refAdd[newName] = value(field[i]);
                    }
                    else {
                        refAdd[field[i]] = {};
                        refAdd = refAdd[field[i]];

                        refRemove[field[i]] = {};
                        refRemove = refRemove[field[i]];

                        value = value(field[i]);
                    }
                }
                return doc.merge(addFieldObject).without(removeFieldObject)
            }).run( connection, {timeFormat: 'raw'}, function(error, result) {
                if (error) handleError(error);
                res.json({
                    error: error,
                    result: result
                });
            })
    }





    // Helpers
    function buildMapKeys(args) {
        var keys = args.keys
        var value = args.value

        if (Object.prototype.toString.call(value) === '[object Object]') {
            if ((value.$reql_type$ === 'TIME') && (value.epoch_time != null)) {
                if (keys['primitiveValueCount'] != null) {
                    keys['primitiveValueCount']++
                }
                else {
                    keys['primitiveValueCount'] = 1
                }
            }
            else {
                if (keys['keys'] == null) { keys['keys'] = {} }
                for(var key in value) {
                    //TODO add hasOwnProperty?
                    // Init object
                    if (keys['keys'][key] == null) { keys['keys'][key] = {} }

                    buildMapKeys({ keys: keys['keys'][key], value: value[key] })
                }

                // Increment count
                if (keys['object_count'] != null) {
                    keys['object_count']++
                }
                else {
                    keys['object_count'] = 1
                }
            }
        }
        else {
            if (keys['primitiveValueCount'] != null) {
                keys['primitiveValueCount']++
            }
            else {
                keys['primitiveValueCount'] = 1
            }
        }

        var type = computeType(value);
        // Init
        if (keys['type'] == null) { keys['type'] = {} }

        if (keys['type'][type] == null) {
            keys['type'][type] = 1
        }
        else {
            keys['type'][type]++
        }
    }
    function computeType(value) {
        //TODO Add the empty string type
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
        return 'object';
    }



    function computeOccurrenceKeys(args) {
        var keys = args.keys

        if (keys['keys'] != null) {
            for(var key in keys['keys']) {
                computeOccurrenceKeys({
                    keys: keys['keys'][key]
                })
            }

            var occurrence = 0
            var count = 0
            if (keys['primitiveValueCount'] != null) {
                occurrence += keys['primitiveValueCount'];
                count++
            }
            for(var key in keys['keys']) {
                occurrence += keys['keys'][key]['occurrenceRebalanced']
                count++
            }

            if (count !== 0) {
                occurrence /= count
                keys['occurrenceRebalanced'] = occurrence
            }
            else {
                keys['occurrenceRebalanced'] = keys.object_count 
            }

        }
        else {
            keys['occurrenceRebalanced'] = keys['primitiveValueCount']
        }

    }

    function buildMostFrequentType(keys) {
        var mapType = keys.type

        if (keys['keys'] != null) {
            for(var key in keys['keys']) {
                buildMostFrequentType(keys['keys'][key])
            }
        }

       
        var max = -1
        var mostFrequentType = null

        for(var type in mapType) {
            var value = mapType[type];
            if (value > max) {
                mostFrequentType = type
                max = value
            }
        }

        keys['most_frequent_type'] = mostFrequentType;

    }

    function sort_keys(keys) {
        if (keys['object_count'] > 0) {
            for(var key in keys['keys']) {
                sort_keys(keys['keys'][key])
            }
            var sorted_keys = [];
            for(var key in keys['keys']) {
                sorted_keys.push(key)
            }
            sorted_keys.sort(function(a, b) {
                a_value = keys['keys'][a].occurrenceRebalanced;
                b_value = keys['keys'][b].occurrenceRebalanced;

                if (a_value < b_value) {
                    return 1
                }
                else if (a_value > b_value) {
                    return -1
                }
                else {
                    a_key = a.toLowerCase()
                    b_key = b.toLowerCase()
                    if (a_key < b_key) {
                        return -1
                    }
                    else if (a_key > b_key) {
                        return 1
                    }
                    return 0
                }
            })

            keys['sorted_keys'] = sorted_keys;
        }
    }


    function flattenKeys(keys, prefix, numDocs) {
        var result = [];

        for(var i=0; i<keys.sorted_keys.length; i++) {
            var hasNestedKeys;
            if (keys.keys[keys.sorted_keys[i]].keys == null) {
                hasNestedKeys = false;
            }
            else {
                for(var key in keys.keys[keys.sorted_keys[i]].keys) {
                    hasNestedKeys = true;
                    break;
                }
            }

            // Save the field if it's a primitive (at least once) or if it's an empty object
            if ((keys.keys[keys.sorted_keys[i]].primitiveValueCount > 0) || (hasNestedKeys === false)) {
                result.push(prefix.concat(keys.sorted_keys[i]))
            }
            else {
                var count = 0;
                for(var type in keys.keys[keys.sorted_keys[i]].type) {
                    count += keys.keys[keys.sorted_keys[i]].type[type]
                }
                if (typeof keys.keys[keys.sorted_keys[i]].primitiveCount === 'number') {
                    count += keys.keys[keys.sorted_keys[i]].primitiveCount;
                }

                if (count < numDocs) {
                    result.push(prefix.concat(keys.sorted_keys[i]))
                }
            }

            // Recursively add more fields
            if ((keys.keys[keys.sorted_keys[i]].type.object != null)
                && (keys.keys[keys.sorted_keys[i]].type.object > 0)) {
                result.push.apply(result, flattenKeys(keys.keys[keys.sorted_keys[i]], prefix.concat([keys.sorted_keys[i]]), numDocs))
            }
        }
        return result
    }
    function nestedKeys(keys, prefix) {
        var result = [];
        prefix = prefix || []

        for(var i=0; i<keys.sorted_keys.length; i++) {
            if ((keys.keys[keys.sorted_keys[i]].type.object != null)
                && (keys.keys[keys.sorted_keys[i]].type.object > 0)) {

                result.push({
                    field: keys.sorted_keys[i],
                    prefix: prefix,
                    nested: nestedKeys( keys.keys[keys.sorted_keys[i]], prefix.concat([keys.sorted_keys[i]]))
                })
            }
            else {
                result.push({
                    field: keys.sorted_keys[i],
                    prefix: prefix
                })
            }
        }
        return result
    }

    function flattenTypes(flattenedKeys, keys) {
        var types = [];
        for(var j=0; j<flattenedKeys.length; j++) {
            var value = keys;
            for(var k=0; k<flattenedKeys[j].length;k++) {
                value = value.keys[flattenedKeys[j][k]];
            }
            types.push(value.most_frequent_type); 
        }
        return types;
    }
    function stringToDate(str) {
        return {
            $reql_type$: 'TIME',
            epoch_time: new Date(str).getTime()/1000,
            timezone: /.*GMT([^\s]{5,6}).*/.exec(str)[1]
        }
    }

    return exports;
}
