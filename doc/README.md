# Chateau - Docs (draft)

This is a short documentation about Chateau.
Since it is a stand-alone app, you shouldn't have a lot of problem to run it.

### Install
Install the dependencies
```
npm install
```

### Configure
Copy the file `config.template.js` and name it `config.js`

```
// RethinkDB settings
exports.host = 'localhost';    // RethinkDB host
exports.port = 28015;          // RethinkDB driver port
exports.authKey = '';          // Authentification key (leave an empty string if you did not set one)

// Express settings
exports.expressPort = 3000;    // Port used by express
exports.debug = true;          // Debug mode
exports.network = '127.0.0.1'  // Network the node app will run on
```

### Run
Start the server
```
./bin/chateau [-f config.js]
```

### Features
- Add/Delete databases
- Add/Delete tables
- Browse the documents in a table
- Order by any fields
- Delete/Update a document (hover on a field to display options)
- Add a document // schema provided
- Import/export (JSON only)
- Empty a table
- Rename/delete a field for a table (hover above a field name for the options)


### Limitations
- You can order a table with more than 99000 documents only if an index exists (primary key or secondary index).
- Chateau considers than an index that has the same name as a field is the corresponding index (a dot is used for nested fields).


### Note about dates
RethinkDB dates are displayed in a "string format" like `Tue Aug 13 2013 19:54:03 GMT-07:00`.

You can update a date by just tweaking the string. Note that the day of the week is not parsed. It is just displayed for your convenience.


### About
Author: Michel Tu -- orphee@gmail.com -- [blog](http://blog.justonepixel.com) -- [twitter](https://twitter.com/neumino)
