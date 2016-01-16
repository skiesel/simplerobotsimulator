'use strict';

angular.module('robotSimulator.diagnostics', [])

.controller('diagnosticsController', ['$scope', 'robot', function($scope, robot) {
	$scope.RobotPose = robot.pose;
	$scope.Sensors = robot.sensors;
}]);