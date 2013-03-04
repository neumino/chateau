Chateau - RethinkDB's castle
====

Chateau is a data explorer for RethinkDB. RethinkDB already comes with a "data explorer", which is more a query buider.


Install
----
Install node.js amd the following node libraries
```
npm install express
npm install coffee-script
npm install handlebars
npm install stylus
npm install rethinkdb
```
Build with
```
make
```


Run
----
```
node build/app.js
```


Versions
----
2013.03.03 - Alpha  
  List databases, tables, documents.
  Add/update/delete document


License
----
MIT License

Contact
----
Michel Tu - orphee@gmail.com



TODO - Rough road maps
----
Do the TODOs in the code
Refactor the code for add/update a document
Implement/test all errors handling
Fix Makefile
Add loading for logout
Sort the documents
Filter documents
Support joins
Add custom actions
Add custom views
Support https
Get a dog (a golden retriever)
