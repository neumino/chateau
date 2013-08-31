'use strict';

/* http://docs.angularjs.org/guide/dev_guide.e2e-testing */
function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
};

function guid() {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

var db = s4();
var table = s4();

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


    
});
