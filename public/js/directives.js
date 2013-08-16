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
    });
