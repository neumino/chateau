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
// docs will contain 202 documents
var docs = [
    { num: 42, str: "Hello", bool: true, nil: null, nested: { field1: 1, field2: 2, field3: 3, field1NotRequired: 4 }, ar: [1,2,3], notRequired: 94 },
    { num: 42, str: "Hello", bool: true, nil: null, nested: { field1: 1, field2: 2, field3: 3, field1NotRequired: 4 }, ar: [1,2,3], notRequired: 94 },
    { num: 42, str: "Hello", bool: true, nil: null, nested: { field1: 1, field2: 2, field3: 3, field1NotRequired: 4 }, ar: [1,2,3], notRequired: 94 },
    { num: 42, str: "Hello", bool: false, nil: null, nested: { field1: 1, field2: 2, field3: 3 }, ar: [1,2,3] }
]
for(var i=0; i< 25; i++) {
    docs.push(docs[0]); docs.push(docs[1]); docs.push(docs[2]); docs.push(docs[3]);
}
var numFields = 12;
var numNestedFields = 1;
var newFieldName = '007';
var newFieldValue = 'James Bond';
var renameFieldName = '001';


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
    describe('Adding a table `/add/table/<db>`', function() {
        beforeEach(function() {
            browser().navigateTo('/add/table/'+db);
        });
        it('should select the good database', function() {
            expect(element('select[ng-model="form.db"]').val()).toMatch(db);
        });
    });


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
        it('There should be some links for operations', function() {
            expect(element('.actions a[href="doc/add/'+db+'/'+table+'"]').count()).toMatch(1);
            expect(element('.actions a[href="field/add/'+db+'/'+table+'"]').count()).toMatch(1);
            expect(element('.actions a[href="export/'+db+'/'+table+'"]').count()).toMatch(1);
            expect(element('.actions a[href="import/'+db+'/'+table+'"]').count()).toMatch(1);
            expect(element('.actions a[href="empty/'+db+'/'+table+'"]').count()).toMatch(1);
            expect(element('.actions a[href="delete/table/'+db+'/'+table+'"]').count()).toMatch(1);
        });
        it('There should be `'+(numFields-numNestedFields+1)+'` fields and one column for the pound key', function() {
            expect(element('th:visible').count()).toMatch(numFields-numNestedFields+1)
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
        it('There should be a select/option for each page -- less than 99000 docs', function() {
            expect(element('option').count()).toMatch(Math.ceil(docs.length/100)*2);
        });
        it('Docs should be ordered by id', function() {
            var ids = []
            element('td.col-0').query( function(el, done) {
                el.each( function(i, idContainer) {
                    ids.push($(idContainer).html());
                });
                
                var orderedIds = [];
                for(var i=0; i<ids.length; i++) {
                    orderedIds.push(ids[i]);
                }
                orderedIds.sort();

                if (angular.equals(ids, orderedIds) == false) {
                    throw new Error("The order of field is not the one expected");
                }

                done();
            })
        });
        it('Docs should be ordered by id -- desc', function() {
            element('a[href="table/'+db+'/'+table+'/0/100/id/desc"]').click()
            expect(browser().location().path()).toMatch('/'+db+'/'+table+'/0/100/id/desc');
            var ids = []
            element('td.col-0').query( function(el, done) {
                el.each( function(i, idContainer) {
                    ids.push($(idContainer).html());
                });
                
                var orderedIds = [];
                for(var i=0; i<ids.length; i++) {
                    orderedIds.push(ids[i]);
                }
                orderedIds.sort().reverse(); // Pfiou, lazyness hit me.

                if (angular.equals(ids, orderedIds) == false) {
                    throw new Error("The order of field is not the one expected");
                }

                done();
            })
        });

        it('Should have a working `next` link', function() {
            var ids = []
            element('td.col-0').query( function(el, done) {
                el.each( function(i, idContainer) {
                    ids.push($(idContainer).html());
                });

                element('.link_previous_next a').click()

                expect(browser().location().path()).toMatch('/'+db+'/'+table+'/100/100/id/asc');

                done();
            })
        });
    })

    describe('Testing the `delete doc` view', function() {
        beforeEach(function() {
            browser().navigateTo('/table/'+db+'/'+table);
        });
        it('Delete a doc', function() {
            element('a[ng-click="deleteTrigger($index)"]:eq(0)').click();

            var id;
            element('.value_td.col-0:eq(0) div').query( function(el, done) {
                id = el.html();
                done();
            });
            element('button[ng-click="deleteDoc($index)"]').click();

            expect(browser().location().path()).toMatch('/table/'+db+'/'+table);

            element('.value_td.col-0:eq(0) div').query( function(el, done) {
                if (id === el.html()) {
                    throw new Error('The document was not deleted');
                }
                done();
            });

        });
    });

    describe('Testing the `update doc` view', function() {
        beforeEach(function() {
            browser().navigateTo('/table/'+db+'/'+table);
        });
        it('Update trigger and get expected fields', function() {
            element('a[ng-click="updateTrigger($index)"]:eq(0)').click();
            var fields = []
            element('.field .field_and_type_container p').query( function(el, done) {
                el.each( function(i, field) {
                    fields.push($(field).html());
                });
                var expected = ['id', 'ar', 'bool', 'nil', 'num', 'str', 'nested', 'field1', 'field2', 'field3', 'field1NotRequired', 'notRequired'];
                if (angular.equals(fields, expected) == false) {
                    throw new Error("The fields are not the expected ones.");
                }
                done();
            })
        });
        it('Testing the types of each fields', function() {
            element('a[ng-click="updateTrigger($index)"]:eq(0)').click();
            var types = []
            element('table select[ng-change="changeNewDocFieldType(field.prefix.concat([field.field]))"]').query( function(el, done) {
                el.each( function(i, select) {
                    types.push($(select).val());
                });
                var expected = ['string', 'array', 'boolean', 'null', 'number', 'string', 'object', 'number', 'number', 'number', 'undefined', 'undefined']
                if ((angular.equals(types.slice(0, types.length-2), expected.slice(0, expected.length-2)) == false) ||
                        ((types[types.length-2] !== 'number') && (types[types.length-2] !== 'undefined')) ||
                        ((types[types.length-1] !== 'number') && (types[types.length-1] !== 'undefined'))
                        ) {
                    console.log(types);
                    throw new Error("Some fields didn't have the expected types.");
                }
                done();
            })
        });

        // TODO Fix the generation of the form to be angular friendly and write test
    });


    describe('Testing export -- only the view', function() {
        beforeEach(function() {
            browser().navigateTo('/export/'+db+'/'+table);
        });
        it('should have a button to export', function() {
            expect(element('button[ng-click="export()"]').count()).toMatch(1)
        });
        // Fix me? Is it possible to really export and test the exported file?
    })

    describe('Testing the `add doc` view', function() {
        beforeEach(function() {
            browser().navigateTo('/doc/add/'+db+'/'+table);
        });
        it('There should be `'+numFields+'` fields', function() {
            expect(element('.field').count()).toMatch(numFields);
        });
        it('Expected fields', function() {
            var fields = []
            element('.field .field_and_type_container p').query( function(el, done) {
                el.each( function(i, field) {
                    fields.push($(field).html());
                });
                var expected = ['id', 'ar', 'bool', 'nil', 'num', 'str', 'nested', 'field1', 'field2', 'field3', 'field1NotRequired', 'notRequired'];
                if (angular.equals(fields, expected) == false) {
                    throw new Error("The fields are not the expected ones.");
                }
                done();
            })
        });
        // TODO Fix the generation of the form to be angular friendly and write test
    });

    describe('Testing the `add field` view', function() {
        beforeEach(function() {
            browser().navigateTo('/field/add/'+db+'/'+table);
        });
        it('Adding a field', function() {
            input('form.name').enter(newFieldName);
            input('form.value').enter(newFieldValue);
            element('button[ng-click="addField()"]').click()
 
            expect(browser().location().path()).toMatch('/table/'+db+'/'+table);
            // We could test all the fields, but that should be enough
            expect(element('th.col-1 .field_span').html()).toMatch(newFieldName);
            expect(element('td.col-1 div').html()).toMatch(newFieldValue);
        });
    });

    describe('Testing the `rename field` feature', function() {
        beforeEach(function() {
            browser().navigateTo('/table/'+db+'/'+table);
        });
        it('There should be `'+numFields+'` fields', function() {
            element('a[ng-click="renameFieldConfirm($index)"]:eq(1)').click();
            expect(element('input[ng-model="newFieldName"]').count()).toMatch(1);
            input('newFieldName').enter(renameFieldName);
            element('button[ng-click="renameField()"]').click();
            expect(browser().location().path()).toMatch('/table/'+db+'/'+table);

            var fields = []
            element('.field_span').query( function(el, done) {
                var foundNewField = false;
                el.each( function(i, field) {
                    if ($(field).html() == renameFieldName) {
                        foundNewField = true;
                        return false;
                    }
                });
                if (foundNewField === false) {
                    throw new Error("Could not find the renamed field.");
                }
                done();
            })
        });
    });
    
    describe('Testing the `delete field` feature', function() {
        beforeEach(function() {
            browser().navigateTo('/table/'+db+'/'+table);
        });
        it('There should be `'+numFields+'` fields', function() {
            element('a[ng-click="deleteFieldConfirm($index)"]:eq(1)').click();
            element('button[ng-click="deleteField()"]').click();
            expect(browser().location().path()).toMatch('/table/'+db+'/'+table);

            var fields = []
            element('.field_span').query( function(el, done) {
                var foundNewField = false;
                el.each( function(i, field) {
                    if ($(field).html() == renameFieldName) {
                        foundNewField = true;
                        return false;
                    }
                });
                if (foundNewField === true) {
                    throw new Error("Found the deleted field.");
                }
                done();
            })
        });
    });
 
    describe('Testing the `empty table` action', function() {
        it('Should empty the table', function() {
            browser().navigateTo('/empty/'+db+'/'+table);
            element('.btn[ng-click="emptyTable()"]').click()
            expect(browser().location().path()).toMatch('/table/'+db+'/'+table);
            expect(element('h1').html()).toMatch('No document');
        });
    });

    describe('Testing the `delete table` action', function() {
        it('Should delete the table', function() {
            browser().navigateTo('/delete/table/'+db+'/'+table);
            element('button[ng-click="deleteTable()"]').click()
            expect(browser().location().path()).toMatch('');
            expect(element('.alert_content').html()).toMatch('Table `'+table+'` successfully dropped.');
        });
    });

    describe('Testing the `delete db` action', function() {
        it('Should delete the database', function() {
            browser().navigateTo('/delete/db/'+db);
            element('button[ng-click="deleteDb()"]').click()
            expect(browser().location().path()).toMatch('');
            expect(element('.alert_content').html()).toMatch('Database `'+db+'` successfully dropped.');
        });
    });

});
