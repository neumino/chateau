// Import
var r = require('rethinkdb'),
    config = require('../config');

var connection = null;
r.connect({
    host: config.host,
    port: config.port,
    authKey: config.authKey
}, function(error, conn) {
    // Throws, if we don't have a connection, we won't do anything...
    if (error) throw error
    connection = conn;
});



exports.databasesAndTables = function (req, res) {
    if (req.query.db != null) {
        r.db(req.query.db).tableList().run( connection, function(error, tables) {
            if (error) console.log(error);
            res.json({
                error: error,
                databases: [{
                    database: req.query.db,
                    tables: tables
                }]
            });
        })

    }
    else {
        r.dbList().forEach(function(db) {
            return r.expr({
                x: [{
                    database:db,
                    tables: r.db(db).tableList() // Add orderBy(r.row) when RethinkDB 1.8 is available
                }]
            })
        })('x').default([]) // If ('x') throws, it means there is no database
        .orderBy('database').run( connection, function(error, databases) {
            if (error) console.log(error);
            res.json({
                error: error,
                databases: databases
            });
        })
    }
}
exports.databaseAdd = function (req, res) {
    r.dbCreate(req.body.name).run( connection, function(error, result) {
        if (error) console.log(error);
        res.json({
            error: error,
            result: result
        });
    })
}
exports.databases = function (req, res) {
    r.dbList().run( connection, function(error, databases) {
        if (error) console.log(error);
        res.json({
            error: error,
            databases: databases
        });
    })
}
exports.tableAdd = function (req, res) {
    var d = req.body;
    var pk = d.primaryKey || 'id'
    r.db(d.database).tableCreate(d.table, {primaryKey: pk}).run( connection, function(error, result) {
        if (error) console.log(error);
        res.json({
            error: error,
            result: result
        });
    })
}
exports.databaseDelete = function (req, res) {
    var d = req.body;
    r.dbDrop(d.database).run( connection, function(error, result) {
        if (error) console.log(error);
        res.json({
            error: error,
            result: result
        });
    })
}
exports.tableDelete = function (req, res) {
    var d = req.body;
    r.db(d.database).tableDrop(d.table).run( connection, function(error, result) {
        if (error) console.log(error);
        res.json({
            error: error,
            result: result
        });
    })
}


exports.table = function (req, res) {
    var db = req.query.db;
    var table = req.query.table;
    var skip = parseInt(req.query.skip) || 0;
    var limit = parseInt(req.query.limit) || 100;
    var sample = req.query.sample || false;
    var sample_size = 100; // TODO magic number.

    // Get primary key
    // TODO Skip info() if sample === true
    r.db(db).table(table).info().run( connection, function(error, info) {
        var primaryKey = info.primary_key
        var order = req.params.order || primaryKey;

        // Get documents
        var query = r.db(db).table(table);
        if (sample !== false) {
            query = query.sample(sample_size).orderBy(r.desc(order))
        }
        else {
            query = query.orderBy(order).skip(skip).limit(limit+1)
        }
        query.run( connection, function(error, cursor) {
            if (error) console.log(error);
            cursor.toArray( function(error, documents) {
                var noDoc = false;
                if (error) console.log(error);

                if (documents.length === 0) {
                    noDoc = true;
                    var doc = {};
                    doc[info.primary_key] = '';
                    documents = [doc];
                }
                //TODO Check that documents is well defined

                // Is there more data?
                var more_data = documents.length > limit;
                if (more_data === true) {
                    documents = documents.slice(0, limit)
                }

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

                // We do not flatten documents because undefined is not a valid JSON type
                res.json({
                    error: error,
                    flattened_fields: flattenedKeys,
                    nestedFields: nestedFields,
                    flattenedTypes: flattenedTypes,
                    documents: (noDoc === true) ? []: documents,
                    noDoc: noDoc,
                    primaryKey: primaryKey,
                    more_data: (more_data) ? '1': '0'
                });
            })
        })
    })
}

exports.docDelete = function (req, res) {
    var db = req.body.db;
    var table = req.body.table;
    var id = req.body.id;
    r.db(db).table(table).get(id).delete().run( connection, function(error, result) {
        if (error) console.log(error);
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

    r.db(db).table(table).get(doc[primaryKey]).replace(doc).run( connection, function(error, result) {
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

    r.db(db).table(table).insert(doc).run( connection, function(error, result) {
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
        for(var key in value) {
            //TODO add hasOwnProperty?
            // Init object
            if (keys['keys'] == null) { keys['keys'] = {} }
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
        occurrence /= count

        keys['occurrenceRebalanced'] = occurrence
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
        // Save the field if it's a primitive (at least once)
        if (keys.keys[keys.sorted_keys[i]].primitiveValueCount > 0) {
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
                // Some keys mapped to undefined, we are showing it while other map to some object
                // TODO we can do a better job for nested fields, but that's an edge case.
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


// Things related to post

// Retrieves a liist of posts with its author and its comments
exports.posts = function (req, res) {
    // We order by date (desc) and joined the author and comments
    Post.orderBy('-date').getJoin().run(function(error, posts) {
        // Convert dates to a human readable format
        if ((posts != null) && (Array.isArray(posts))) {
            for(var i=0; i< posts.length; i++) {
                var fullDate = new Date(posts[i].date);
                posts[i].date = fullDate.getMonth()+'/'+
                    fullDate.getDate()+'/'+
                    fullDate.getFullYear();
            }
        }
        // Send back the data
        res.json({
            error: error,
            posts: posts
        });
       
    })
};

// Retrieves one post with all its data (author and comments)
exports.post = function (req, res) {
    var id = req.params.id;
    // Get one post and its author and comments
    Post.get(id).getJoin().run(function(error, post) {
        // Convert dates to a human readable format
        var fullDate;
        if ((post != null) && (Array.isArray(post.comments))) {
            for(var i=0; i< post.comments.length; i++) {
                fullDate = new Date(post.comments[i].date);
                post.comments[i].date = fullDate.getMonth()+'/'+
                    fullDate.getDate()+'/'+
                    fullDate.getFullYear();
            }
        }
        if (post != null) {
            fullDate = new Date(post.date);
            post.date = fullDate.getMonth()+'/'+
                fullDate.getDate()+'/'+
                fullDate.getFullYear();
        }

        // Send back the data 
        res.json({
            error: error,
            post: post
        });
    })
};

// Retrieves a post and all authors available
exports.postAndAuthors = function (req, res) {
    var id = req.params.id;
    // Retrieve a post and all the authors that exist
    // This currently cannot be done in one query with Thinky -- the feature is on the roadmap

    // Get the post
    Post.get(id).run(function(error_post, post) {
        // Get all authors
        Author.run(function(error_author, authors) {
            // Send back everything
            res.json({
                error_post: error_post,
                error_author: error_author,
                post: post,
                authors: authors
            });
        })
    })
};

// Saves a post in the database
exports.addPost = function (req, res) {
    // Create a new post
    var newPost = new Post(req.body);

    // Save it
    newPost.save(function(error, result) {
        res.json({
            error: error,
            result: result
        });
    });
};

// Deletes a post from the database
exports.deletePost = function (req, res) {
    var id = req.params.id;

    // Deletes the post
    Post.get(id).delete( function(error, result) {
        res.json({
            error: error,
            result: result
        });

    });
};

// Updates a post in the database
exports.editPost = function (req, res) {
    var newPost = new Post(req.body);

    // Updates the post
    newPost.update( function(error, post) {
        res.json({
            error: error,
            post: post
        });
    });
};


// Things related to authors

// Retrieves all authors
exports.authors = function (req, res) {
    // Get all authors
    Author.orderBy('name').run(function(error, authors) {
        res.json({
            error: error,
            authors: authors
        });
    })
};

// Retrieves one author
exports.author = function (req, res) {
    var id = req.params.id;
    // Get an author
    // Instead of calling .get() then .run() we can just pass a callback to get.
    Author.get(id, function(error, author) {
        res.json({
            error: error,
            author: author
        });
    })
};

// Saves an author in the database
exports.addAuthor = function (req, res) {
    // Creates an author based on req.body
    var newAuthor = new Author(req.body);

    // Saves it
    newAuthor.save(function(error, result) {
        res.json({
            error: error,
            result: result
        });
    });
};
// Deletes an author
exports.deleteAuthor = function (req, res) {
    var id = req.params.id;
    // Deletes an author
    Author.get(id).delete( function(error, result) {
        res.json({
            error: error,
            result: result
        })

    });
};
// Edits an author
exports.editAuthor = function (req, res) {
    // Create the author based on req.body
    var newAuthor = new Author(req.body);

    // Update an author
    newAuthor.update( function(error, author) {
        res.json({
            error: error,
            author: author
        })
    });
};


// Things related to comments
exports.addComment = function (req, res) {
    // Creates a comment based on req.body
    var newComment = new Comment(req.body);

    // Saves it
    newComment.save(function(error, result) {
        res.json({
            error: error,
            result: result
        });
    });
};


// Deletes comment
exports.deleteComment = function (req, res) {
    var id = req.params.id;
    // Deletes a comment
    Comment.get(id).delete( function(error, result) {
        res.json({
            error: error,
            result: result
        })
    });
};
