# Chateau - Data explorer for RethinkDB.

RethinkDB already comes with a "data explorer", which is more like a query buider.
Chateau is a data explorer where you can manage your data without writing a single query.

It's still an alpha version so many features are missing, but it's enough if you want to
bootstrap a new application and use Chateau as a panel admin for you data.

You can think of Chateau like a PhpMyAdmin for RethinkDB.


### Install
Install the dependencies
```
npm install
```

### Configure
Update the file `config.js` if you are not using the default RethinkDB parameters.

### Run
Start the server
```
node app.js
```

### Features
- Add/Delete databases
- Add/Delete tables
- Browse the documents in a table
- Single update
- Add a document // schema provided

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

