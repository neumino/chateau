'use strict';

// Main app
angular.module('chateau', ['chateau.filters', 'chateau.services', 'chateau.directives']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.
      when('/', {
        templateUrl: 'partials/index',
        controller: IndexCtrl
      }).
      when('/msg/:msg', {
        templateUrl: 'partials/index',
        controller: IndexCtrl
      }).
      when('/add/db', {
        templateUrl: 'partials/db_add',
        controller: AddDbCtrl
      }).
      when('/add/table/:db', {
        templateUrl: 'partials/table_add',
        controller: AddTableCtrl
      }).
      when('/delete/db/:db', {
        templateUrl: 'partials/db_delete_confirm',
        controller: DeleteDbCtrl
      }).
      when('/delete/table/:db/:table', {
        templateUrl: 'partials/table_delete_confirm',
        controller: DeleteTableCtrl
      }).
      when('/db/:db', {
        templateUrl: 'partials/index',
        controller: IndexCtrl
      }).
      when('/table/:db/:table', {
        templateUrl: 'partials/table',
        controller: TableCtrl
      }).
      when('/table/:db/:table/:skip/:limit/:order/:ascDescValue', {
        templateUrl: 'partials/table',
        controller: TableCtrl
      }).
      when('/doc/add/:db/:table', {
        templateUrl: 'partials/doc_add',
        controller: AddDocCtrl 
      }).
      when('/field/add/:db/:table', {
        templateUrl: 'partials/field_add',
        controller: AddFieldCtrl 
      }).
      when('/export/:db/:table', {
        templateUrl: 'partials/table_export',
        controller: ExportTableCtrl
      }).
      when('/import/:db/:table', {
        templateUrl: 'partials/table_import',
        controller: ImportTableCtrl
      }).
      when('/empty/:db/:table', {
        templateUrl: 'partials/table_empty',
        controller: EmptyTableCtrl
      }).
      otherwise({
        redirectTo: '/'
      });
    $locationProvider.html5Mode(true);
  }]);
