'use strict';

// Declare app level module which depends on views, and components
angular.module('robotSimulator', [
	'robotSimulator.diagnostics',
	'robotSimulator.renderer',
])

.directive('fullPageHeight', function($window){
	return{
		controller: ['$scope', function ($scope) {
			$scope.resize = false;

        	$scope.$watch("resize", function() {
        		$scope.$broadcast("resize");
        	});
		}],
		link: function(scope, element, attrs){

			scope.resizeToFullPageHeight = function() {
				scope.resize = !scope.resize;
				element.css('height', $window.innerHeight + "px");
			};

			scope.resizeToFullPageHeight();

			angular.element($window).bind('resize', function() {
				scope.resizeToFullPageHeight();
				scope.$apply();
			});
		}
	}
})

.factory('robot', function($rootScope){
  var robot = {};

  robot.pose = { x : 4.5, y : 4.5, theta : 0 };
  robot.radius = 0.75;
  robot.sensors = {};

  robot.move = function(translation) {
		robot.pose.x += Math.cos(robot.pose.theta) * translation;
		robot.pose.y += Math.sin(robot.pose.theta) * translation;
  };

  robot.rotate = function(rotation) {
		robot.pose.theta += rotation;
		while(robot.pose.theta > Math.PI) {
			robot.pose.theta -= 2 * Math.PI;;
		}
		while(robot.pose.theta < -Math.PI) {
			robot.pose.theta +=  2 * Math.PI;
		}
  };

  robot.updateSensors = function(which, sensors) {
  	robot.sensors[which] = sensors;
  };

  return robot;
});
;
