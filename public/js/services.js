'use strict';

/* Services */
angular.module('chateau.services', [])
    .factory('sharedHeader', function($rootScope) {
        var sharedService = {};

        sharedService.updatePath = function(scope) {
            this.db = scope.db;
            this.table = scope.table;
            this.broadcastItem();
        };

        sharedService.broadcastItem = function() {
            $rootScope.$broadcast('pathUpdated');
        };

        return sharedService;
    })
    .factory('feedback', function($rootScope) {
        var sharedService = {};

        sharedService.getMessage = function(scope) {
            var message = this.message;
            this.message = null;
            return message
        };

        sharedService.setMessage = function(message) {
            this.message = message;
        };

        return sharedService;
    });


