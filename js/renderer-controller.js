'use strict';

angular.module('robotSimulator.renderer', [])

.directive('myEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.myEnter);
                });

                event.preventDefault();
            }
        });
    };
})

.controller('rendererController', ['$scope', '$window', 'robot', function($scope, $window, robot) {
	var cellsPerRow = 10;
	var cellsPerColumn = 10;
	var rowUnit = 0;
	var columnUnit = 0;

	var translationUnit = 0.1;
	var rotationUnit = Math.PI * 0.05;
	var numLidarBeams = 10;
	var lidarSweep = Math.PI / 2;
	var lidarRange = 3;

	var walls = [];

	function generateWalls() {
		for(var i = 0; i < cellsPerRow; i++) {
			for(var j = 0; j < cellsPerColumn; j++) {
				if(j != 0 && Math.random() < 0.15) {
					walls.push({
						startX : i,
						startY : j,
						endX : i + 1,
						endY : j,
					});
				}
				if(i != 0 && Math.random() < 0.15) {
					walls.push({
						startX : i,
						startY : j,
						endX : i,
						endY : j + 1,
					});
				}
			}
		}
	}
	generateWalls();

	function resizeCanvas() {
		var canvas = angular.element('#canvas');
		var parent = angular.element("#" + canvas[0].parentNode.id);
		var width = parent.innerWidth();
		var height = parent.innerHeight();

		canvas.attr('width', width);
		canvas.attr('height', height);

		rowUnit = width / cellsPerColumn;
		columnUnit = height / cellsPerRow;
	}

	function drawMap() {
		var context = document.getElementById("canvas").getContext("2d");

		context.strokeStyle = "black";

		angular.forEach(walls, function(wall) {
			var startX = wall.startX * rowUnit;
			var startY = wall.startY * columnUnit;
			var endX = wall.endX * rowUnit;
			var endY = wall.endY * columnUnit;

			context.beginPath();
			context.moveTo(startX, startY);
			context.lineTo(endX, endY);
			context.stroke();
		});
		
	}

	function checkLineIntersection(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
	    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
	    var denominator, a, b, numerator1, numerator2, result = {
	        x: null,
	        y: null,
	        onLine1: false,
	        onLine2: false
	    };
	    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
	    if (denominator == 0) {
	        return result;
	    }
	    a = line1StartY - line2StartY;
	    b = line1StartX - line2StartX;
	    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
	    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
	    a = numerator1 / denominator;
	    b = numerator2 / denominator;

	    // if we cast these lines infinitely in both directions, they intersect here:
	    result.x = line1StartX + (a * (line1EndX - line1StartX));
	    result.y = line1StartY + (a * (line1EndY - line1StartY));
	/*
	        // it is worth noting that this should be the same as:
	        x = line2StartX + (b * (line2EndX - line2StartX));
	        y = line2StartX + (b * (line2EndY - line2StartY));
	        */
	    // if line1 is a segment and line2 is infinite, they intersect if:
	    if (a > 0 && a < 1) {
	        result.onLine1 = true;
	    }
	    // if line2 is a segment and line1 is infinite, they intersect if:
	    if (b > 0 && b < 1) {
	        result.onLine2 = true;
	    }
	    // if line1 and line2 are segments, they intersect if both of the above are true
	    return result;
	}

	function getNearestObstacleCollision(x0, y0, x1, y1, drawCollision) {
		var nearestCollision = null;
		var nearestDist = 1000000000;

		angular.forEach(walls, function(wall) {
			var wallX0 = wall.startX * rowUnit;
			var wallY0 = wall.startY * columnUnit;
			var wallX1 = wall.endX * rowUnit;
			var wallY1 = wall.endY * columnUnit;

			var intersection = checkLineIntersection(x0, y0, x1, y1, wallX0, wallY0, wallX1, wallY1);
			if(intersection.onLine1 && intersection.onLine2) {

				if(drawCollision === true) {
					var context = document.getElementById("canvas").getContext("2d");

					context.strokeStyle = "red";
					context.beginPath();
					context.moveTo(x0, y0);
					context.lineTo(x1, y1);
					context.stroke();

					context.beginPath();
					context.moveTo(wallX0, wallY0);
					context.lineTo(wallX1, wallY1);
					context.stroke();
				}

				var dx = x0 - intersection.x;
				var dy = y0 - intersection.y;
				var dist = dx*dx + dy*dy;
				if(dist < nearestDist) {
					nearestDist = dist;
					nearestCollision = {
						x : intersection.x,
						y : intersection.y,
					};
				}
			}
		});

		return nearestCollision;
	}

	function rotatePoint(pt, theta) {
		var x = pt.x * Math.cos(theta) - pt.y * Math.sin(theta);
		var y = pt.x * Math.sin(theta) + pt.y * Math.cos(theta);
		return { x : x, y : y };
	}

	function translatePoint(pt, dx, dy) {
		var x = pt.x + dx;
		var y = pt.y + dy;
		return { x : x, y : y };
	}

	function getRobotPoints() {
		var robotX = robot.pose.x * rowUnit;
		var robotY = robot.pose.y * columnUnit;

		var width =  rowUnit * robot.radius * 0.5;
		var height = columnUnit * robot.radius * 0.5;

		var p0 = {
			x : -width,
			y : -height,
		};
		p0 = translatePoint(rotatePoint(p0, robot.pose.theta), robotX, robotY);

		var p1 = {
			x : width,
			y : -height,
		};
		p1 = translatePoint(rotatePoint(p1, robot.pose.theta), robotX, robotY);

		var p2 = {
			x : width,
			y : height,
		};
		p2 = translatePoint(rotatePoint(p2, robot.pose.theta), robotX, robotY);

		var p3 = {
			x : -width,
			y : height,
		};
		p3 = translatePoint(rotatePoint(p3, robot.pose.theta), robotX, robotY);

		var p4 = {
			x : width,
			y : 0,
		};
		p4 = translatePoint(rotatePoint(p4, robot.pose.theta), robotX, robotY);

		return [p0, p1, p2, p3, {x:robotX, y:robotY},  p4];
	}

	function getLidarEndPoints() {
		var pts = [];
		var robotX = robot.pose.x * rowUnit;
		var robotY = robot.pose.y * columnUnit;

		var width =  rowUnit * robot.radius * 0.5;
		var height = columnUnit * robot.radius * 0.5;

		var startPoint = {
			x : width,
			y : 0,
		};
		startPoint = translatePoint(rotatePoint(startPoint, robot.pose.theta), robotX, robotY);

		pts.push(startPoint);

		var lidarIncrement = lidarSweep / numLidarBeams;
		var range = lidarRange * Math.max(rowUnit, columnUnit);

		for(var i = 0; i <= numLidarBeams; i++) {
			var theta = -lidarSweep / 2 + lidarIncrement * i;
			var pt = {
				x : range,
				y : 0,
			};
			pt = translatePoint(rotatePoint(rotatePoint(pt, theta), robot.pose.theta), robotX, robotY);

			// pt = translatePoint(rotatePoint(translatePoint(rotatePoint(pt, theta), startPoint.x, startPoint.y), robot.pose.theta), robotX, robotY);
			pts.push(pt);
		}
		return pts;
	}

	function drawRobot(pts) {
		if(typeof pts == "undefined") {
			pts = getRobotPoints();
		}

		var context = document.getElementById("canvas").getContext("2d");
		context.strokeStyle = "blue";

		context.moveTo(pts[0].x, pts[0].y);
		context.lineTo(pts[1].x, pts[1].y);
		context.lineTo(pts[2].x, pts[2].y);
		context.lineTo(pts[3].x, pts[3].y);
		context.lineTo(pts[0].x, pts[0].y);
		context.stroke();

		context.beginPath();
		context.moveTo(pts[4].x, pts[4].y);
		context.lineTo(pts[5].x, pts[5].y);
		context.stroke();

		context.strokeStyle = "red";
		context.setLineDash([5, 5]);

		var sensorRanges = [];

		var lidarEndpoints = getLidarEndPoints();
		for(var i = 1; i < lidarEndpoints.length; i++) {
			var collision = getNearestObstacleCollision(lidarEndpoints[0].x, lidarEndpoints[0].y, lidarEndpoints[i].x, lidarEndpoints[i].y);

			context.beginPath();
			if(collision != null) {
				var dx = lidarEndpoints[0].x - collision.x;
				var dy = lidarEndpoints[0].y - collision.y;
				sensorRanges.push(Math.sqrt(dx*dx + dy*dy));
				context.lineTo(lidarEndpoints[0].x, lidarEndpoints[0].y);
				context.lineTo(collision.x, collision.y);
			} else {
				sensorRanges.push(lidarRange * Math.max(rowUnit, columnUnit));
				context.lineTo(lidarEndpoints[0].x, lidarEndpoints[0].y);
				context.lineTo(lidarEndpoints[i].x, lidarEndpoints[i].y);
			}
			context.stroke();
		}
		context.setLineDash([]);

		robot.updateSensors("Lidar", sensorRanges);
	}

	$scope.$on('resize', function() {
		resizeCanvas();
		drawMap();
		drawRobot();
	});

	$scope.keyboard = function(event) {
		console.log(event);
		var translation = 0;
		var rotation = 0;
		switch(event.which) {
			case 119: //forward
				translation = translationUnit;
			break;
			case 115: //back
				translation = -translationUnit;
			break;
			case 114: //rotate
				rotation = -rotationUnit;
			break;
			case 102: //rotate
				rotation = rotationUnit;
			break;
			default:
			return;
		}
		robot.move(translation);
		robot.rotate(rotation);

		var robotPoints = getRobotPoints();

		var collision = false;
		for(var i = 0; i < 5; i++) {
			var next = (i + 1) % 4;
			if(getNearestObstacleCollision(robotPoints[i].x, robotPoints[i].y,
				robotPoints[next].x, robotPoints[next].y, true) != null) {
				collision = true;
				break;
			}
		}

		if(collision) {
			robot.move(-translation);
			robot.rotate(-rotation);
			robotPoints = undefined;
		} else {
			resizeCanvas();
			drawMap();
			drawRobot();
		}
	};

	
}]);