'use strict';


// Update scope in a e2e test
angular.scenario.dsl('magic', function() {
    var chain = {};

    chain.getScope = function(selector) {
        var application = this.application;
        return this.addFutureAction('getting scope', function($window, $document, done) {
            var scope = $window.angular.element($window.$('.real_file')).scope();
            var file = new Blob([JSON.stringify(docs)], {type: "text\/plain"});
            scope.file = file;

            done();
        })
    };

    return function() {
        return chain;
    };
});

// Geneerate uuid helper
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
};

// Generate uuid
function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

// Initialize variables used for the test
var db = s4();
var table = s4();
var docs = [
    { num: 42, str: "Hello", bool: true, nil: null, nested: { field1: 1, field2: 2, field3: 3, field1NotRequired: 4 }, ar: [1,2,3], notRequired: 94 },
    { num: 42, str: "Hello", bool: false, nil: null, nested: { field1: 1, field2: 2, field3: 3 }, ar: [1,2,3] }
]
for(var i=0; i< 100; i++) {
    docs.push(docs[0]);
    docs.push(docs[1]);
}


// Rolling the tests
describe('Chateau', function() {
    describe('view `/`', function() {
        beforeEach(function() {
            browser().navigateTo('/');
        });
        it('should have `Chateau - Data explorer for RethinkDB` as a title', function() {
            expect(element('title').html()).toMatch("Chateau - Data explorer for RethinkDB");
        });
        it('should have only one visible link in the header (Chateau)', function() {
            expect(element('header a:visible').count()).toMatch(1);
        });
        it('should have two available actions', function() {
            expect(element('.actions a').count()).toMatch(2);
        });
        it('should have two available actions', function() {
            element('.actions a:first-child').click();
            expect(browser().location().path()).toMatch('/add/db');
        });
    });

    describe('Adding a database `/add/db`', function() {
        beforeEach(function() {
            browser().navigateTo('/add/db');
        });
        it('should add a db', function() {
            input('form.name').enter(db)
            element('.submit_db').click(); 

            expect(browser().location().path()).toMatch('/');
            expect(element('a[href="/db/'+db+'"]').count()).toMatch(1)
        });
    });
    describe('Testing non valid input for a new database `/add/db`', function() {
        beforeEach(function() {
            browser().navigateTo('/add/db');
        });

        it('should not display any error at the begining', function() {
            expect(element('.empty_field:visible').count()).toMatch(0);
        });
        it('should error if the db name is empty', function() {
            element('.submit_db').click(); 
            expect(element('.empty_field:visible').count()).toMatch(1);
        });
        it('should reject invalid names and display an error', function() {
            input('form.name').enter('test.invalid-char')
            element('.submit_db').click(); 
            expect(element('#error .alert').count()).toMatch(1);
        });
        it('should reject duplicate names and display an error', function() {
            input('form.name').enter(db)
            element('.submit_db').click(); 
            expect(element('#error .alert').count()).toMatch(1);
        });
    });

    describe('Adding a table `/add/table`', function() {
        beforeEach(function() {
            browser().navigateTo('/add/table/');
        });
        it('should add a table', function() {
            select('form.db').option(db);
            input('form.table').enter(table);
            element('.submit_table').click(); 

            expect(browser().location().path()).toMatch('/');
            expect(element('a[href="/table/'+db+'/'+table+'"]').count()).toMatch(1)
        });
    });

    describe('Testing non valid input for a new table `/add/table`', function() {
        beforeEach(function() {
            browser().navigateTo('/add/table/');
        });

        it('should not display any error at the begining', function() {
            expect(element('.empty_field:visible').count()).toMatch(0);
        });
        it('should error if no db is selected', function() {
            element('.submit_table').click(); 
            expect(element('.undefined_db:visible').count()).toMatch(1);
        });
        it('should error if the table name is empty', function() {
            select('form.db').option(db);
            element('.submit_table').click(); 
            expect(element('.undefined_table:visible').count()).toMatch(1);
        });
        it('should reject duplicate table names and display an error', function() {
            select('form.db').option(db);
            input('form.table').enter('table-unvalid.name');
            element('.submit_table').click(); 
            expect(element('#error .alert').count()).toMatch(1);
        });
        it('should reject duplicate table names and display an error', function() {
            select('form.db').option(db);
            input('form.table').enter(table);
            element('.submit_table').click(); 
            expect(element('#error .alert').count()).toMatch(1);
        });
    });
    //TODO Add test for `add/table/<db>`

    describe('Testing import -- `Holy cow`', function() {
        beforeEach(function() {
            browser().navigateTo('/import/'+db+'/'+table);
        });
        it('should have a real field `.real_file` for the file', function() {
            expect(element('.real_file').count()).toMatch(1)
        });
        it('should import data', function() {
            magic().getScope('.real_file');
            element('.import_btn').click();
            expect(browser().location().path()).toMatch('/table/'+db+'/'+table);

            expect(element('tr:visible').count()).toMatch(101); // max elements per page
        });
    })


    describe('Testing the table view', function() {
        beforeEach(function() {
            browser().navigateTo('/table/'+db+'/'+table);
        });
        it('There should be 11 fields and one column for the pound key', function() {
            expect(element('th:visible').count()).toMatch(12)
        });
        it('Fields should be ordered -- pk, occurence, alphabetic', function() {
            var fields = []
            element('.field_span').query( function(el, done) {
                el.each( function(i, field) {
                    fields.push($(field).html());
                });
                
                var expected = ["id", "ar", "bool", "nil", "num", "str", "nested.field1", "nested.field2", "nested.field3", "nested.field1NotRequired", "notRequired"]
                if (angular.equals(fields, expected) == false) {
                    throw new Error("The order of field is not the one expected");
                }

                done();
            })
        });

    })


    
});
