'use strict';

/* Services */
angular.module('chateau.services', [])
    .service('sharedProperties', function () {
        var property = 'First';

        return {
            getProperty: function () {
            return property;
            },
            setProperty: function(value) {
                property = value;
            }
        };
    });

