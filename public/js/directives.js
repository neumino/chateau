'use strict';

/* Directives */
angular.module('chateau.directives', [])
    .directive('ngAutoExpand', function() {
        return {
            restrict: 'A',
            link: function( $scope, elem, attrs) {
                elem.bind('keyup', function($event) {
                    var element = $event.target;
                    var scrollPosition = $(window).scrollTop()
                    $(element).height(0);
                    var height = $(element)[0].scrollHeight

                    // 8 is for the padding
                    if (height < 20) {
                        height = 28
                    }
                    $(element).height(height-8)
                    $(window).scrollTop(scrollPosition)
                });
                setTimeout( function() {
                    var element = elem;
                    var height = $(element)[0].scrollHeight

                    // 8 is for the padding
                    if (height < 20) {
                        height = 28
                    }
                    $(element).height(height-8)
                }, 0)

            }
        };
    })
    .directive('ngEnter', function() {
        return {
            restrict: 'A',
            scope: false,
            link: function( scope, elem, attrs) {
                elem.bind('keypress', function($event) {
                    if (event.which === 13) {
                        scope[attrs['ngEnter']]()
                    }
                });
            }
        };
    })
    .directive('ngAutoFocus', function() {
        return {
            restrict: 'A',
            scope: false,
            link: function(scope, elem, attrs) {
                $(elem).focus()
            }
        }
    })
    .directive('ngForceLoad', function($location, $route) {
        return {
            retrict: 'A',
            link: function( $scope, elem, attrs) {
                elem.bind('click', function($event) {
                    if (elem.attr('href') === $location.path()) {
                        $route.reload()
                    }
                })
            }
        }
    });
