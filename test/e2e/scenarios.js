'use strict';

/* http://docs.angularjs.org/guide/dev_guide.e2e-testing */

describe('my app', function() {
    describe('view `/`', function() {
        beforeEach(function() {
            browser().navigateTo('/');
        });
        it('should have only one link in the header', function() {
            expect(element('html').count()).toMatch(1);
        });
    });
});
