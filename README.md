# Chateau - Data explorer for RethinkDB.

RethinkDB already comes with a "data explorer", which is more like a query builder.
Chateau is a data explorer where you can manage your data without writing a single query.

It's still an alpha version, so many features are missing, but it's enough if you want to
bootstrap a new application and use Chateau as an admin panel for you data.

You can think of Chateau like a phpMyAdmin for RethinkDB.

### Install from npm
```
sudo npm install -g chateau
chateau
```

### Install from source

Clone the repository

```
git clone git@github.com:neumino/chateau
```


Install the dependencies

```
npm install
```

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

Start the server
```
./bin/chateau [-f config.js] [-p port]
```

### Features
- Add/delete databases
- Add/delete tables
- Browse the documents in a table
- Order by any fields (see [docs/README.md](https://github.com/neumino/chateau/blob/master/doc/README.md) for the limitations)
- Delete/update a document (hover on a field to display options)
- Add a document // schema provided
- Import/export (JSON only)
- Empty a table
- Rename/delete a field for a table (hover above a field name for the options)

### Documentation
See [docs/README.md](https://github.com/neumino/chateau/blob/master/doc/README.md) (draft).


### Test
Start RethinkDB and Chateau, then launch karma.

```
karma start test/config/karma.e2e.js
```

### Contribute
- Feedback is always welcome!
- Pull requests are welcome!

### About
Author: Michel Tu -- orphee@gmail.com -- [blog](http://blog.justonepixel.com) -- [twitter](https://twitter.com/neumino)

### License
Copyright (c) 2013 Michel Tu <orphee@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the 'Software'), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.
