$(document).ready(function () {

    var model = new PageModel('.moveable-text');

    $("html").mousemove(function (event) {
        model.processMouseChange(event);
    });

});

var PageModel = function (moveableSelector) {
    var self = this;

    self.moveableSelector = moveableSelector;   // the selector that will hold the movable characters
    self.uncapturedElements = [];
    self.capturedElements = [];
    self.currentTarget = {};
    self.targetLastUpdated = {};

    self.processMouseChange = function (event) {
        self.currentTarget = { x: event.pageX, y: event.pageY };
    };

    // check to see if our elements need to know that the mouse/target has moved
    // we do this on a loop rather than everytime the mouse moves to reduce resource usage
    self.targetUpdateLoop = function () {

        if (self.currentTarget.x === self.targetLastUpdated.x && self.currentTarget.y === self.targetLastUpdated.y) {
            // if the target hasn't changed we don't need to update anything
        } else {
            self.updateCapturedTargets(self.currentTarget);
            self.checkForElementsToCapture(self.currentTarget);
            self.targetLastUpdated.x = self.currentTarget.x;
            self.targetLastUpdated.y = self.currentTarget.y;
        }

        setTimeout(function () {
            self.targetUpdateLoop();
        }, 100);
    };
    self.targetUpdateLoop();

    // go through the items we have moved and update the target they need to move too
    self.updateCapturedTargets = function (coordinates) {
        for (var i = 0; i < self.capturedElements.length; i++) {
            self.capturedElements[i].updateTarget(coordinates);
        }
    };

    // go through items that haven't been moved and see if they are close enough to the cursor to start moving
    self.checkForElementsToCapture = function (coordinates) {
        for (var i = self.uncapturedElements.length - 1; i >= 0; i--) {
            var element = self.uncapturedElements[i];
            // how close is this element?
            if (self.uncapturedElements[i].distanceFromCoordinates(coordinates) < 100) {
                self.uncapturedElements.splice(i, 1);
                element.setAsCaptured(coordinates);
                self.capturedElements.push(element);
            }
        }
    };

    // tell all the elements that need to move that now is the time
    self.moveLoop = function () {
        for (var i = 0; i < self.capturedElements.length; i++) {
            self.capturedElements[i].move();
        }

        setTimeout(function () {
            self.moveLoop();
        }, 100);
    };
    self.moveLoop();

    // setup the elements on the page so we can manipulate them and get a handle to everything in our model
    self.initialize = function () {

        $(self.moveableSelector).each(function (index, element) {
            var container = $(this);
            // make it so the parent container height doesn't go to nothing when the contents become absolute
            $(this).height($(this).height());

            // get all the characters in an array and empty out the parent
            var characters = $(this).html().split("");
            $(this).empty();
            // wrap each character in an element so we can manipulate its position etc
            $.each(characters, function (i, el) {
                container.append("<span class='split'>" + el + "</span");
            });
        })

        // give each of our elements a unique id, position it absolutely and create a js model for it
        $(".split").each(function (index, value) {
            var offset = $(this).offset();
            $(this).attr({ id: 'pageElement' + index });
            var pageElement = new PageElement('pageElement' + index, { x: offset.left, y: offset.top });
            self.uncapturedElements.push(pageElement);
        }).css({ position: 'absolute' });

    };
    self.initialize();
};

var PageElement = function (elementId, currentPosition) {
    var self = this;

    self.elementId = elementId;
    self.status = "uncaptured";
    self.target = {};
    self.travelDistance = 15;
    self.currentLocation = {};
    self.currentLocation.x = currentPosition.x;
    self.currentLocation.y = currentPosition.y;

    self.placeAtCoordinates = function (coordinates) {
        $('#' + elementId).css({ top: coordinates.y + 'px', left: coordinates.x + 'px' });
    };
    self.placeAtCoordinates(self.currentLocation);

    self.move = function () {
        // if we've already arrived then we don't need to do anything
        if (self.status === "completed") {
            return;
        }
        var distance = self.travelDistance;

        var delta_x = self.target.x - self.currentLocation.x;
        var delta_y = self.target.y - self.currentLocation.y;
        var theta_radians = Math.atan2(delta_y, delta_x);

        // check to see if we so close that we should just move to the target
        var currentDistanceFromTarget = Math.sqrt((delta_x * delta_x) + (delta_y * delta_y));
        if (currentDistanceFromTarget <= self.travelDistance) {
            self.currentLocation.x = self.target.x;
            self.currentLocation.y = self.target.y;
            self.placeAtCoordinates(self.currentLocation);
            self.setAsCompleted();
            return;
        }

        // what is the adjacent (X)
        var adjacent = Math.cos(theta_radians) * distance;
        // what is the opposite (Y)
        var opposite = Math.sin(theta_radians) * distance;
        self.currentLocation.x = self.currentLocation.x + adjacent;
        self.currentLocation.y = self.currentLocation.y + opposite;
        // update the element on the page
        self.placeAtCoordinates(self.currentLocation);
    };
    // returns how far this object is from the given coordinates
    self.distanceFromCoordinates = function (coordinates) {
        var delta_x = coordinates.x - self.currentLocation.x;
        var delta_y = coordinates.y - self.currentLocation.y;

        var currentDistanceFromTarget = Math.sqrt((delta_x * delta_x) + (delta_y * delta_y));
        return currentDistanceFromTarget;
    };
    self.updateTarget = function (newTarget) {
        if (self.status === 'completed') {
            self.currentLocation = self.target;
            self.placeAtCoordinates(self.currentLocation);
        }
        self.target = newTarget;
    };
    self.setAsCaptured = function (target) {
        self.status = "captured";
        self.updateTarget(target);
    };
    self.setAsCompleted = function () {
        self.status = "completed";
    };
};