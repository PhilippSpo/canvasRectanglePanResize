// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Last update December 2011
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Constructor for Shape objects to hold data for all drawn objects.
// For now they will just be defined as rectangles.
function Shape(x, y, w, h, fill) {
  // This is a very simple and unsafe constructor. All we're doing is checking if the values exist.
  // "x || 0" just means "if there is a value for x, use that. Otherwise use 0."
  // But we aren't checking anything else! We could put "Lalala" for the value of x 
  this.x = x || 0;
  this.y = y || 0;
  this.w = w || 1;
  this.h = h || 1;
  this.fill = fill || '#AAAAAA';
  this.selected = false;
  this.closeEnough = 10;
}

// Draws this shape to a given context
Shape.prototype.draw = function(ctx) {
  ctx.fillStyle = this.fill;
  ctx.fillRect(this.x, this.y, this.w, this.h);

  if (this.selected === true) {
    this.drawHandles(ctx);
  }
};

// Draw handles for resizing the Shape
Shape.prototype.drawHandles = function(ctx) {
  drawRectWithBorder(this.x, this.y, this.closeEnough, ctx);
  drawRectWithBorder(this.x + this.w, this.y, this.closeEnough, ctx);
  drawRectWithBorder(this.x + this.w, this.y + this.h, this.closeEnough, ctx);
  drawRectWithBorder(this.x, this.y + this.h, this.closeEnough, ctx);
};

// Determine if a point is inside the shape's bounds
Shape.prototype.contains = function(mx, my) {
  if (this.touchedAtHandles(mx, my) === true) {
    return true;
  }
  var xBool = false;
  var yBool = false;
  // All we have to do is make sure the Mouse X,Y fall in the area between
  // the shape's X and (X + Width) and its Y and (Y + Height)
  if (this.w >= 0) {
    xBool = (this.x <= mx) && (this.x + this.w >= mx);
  } else {
    xBool = (this.x >= mx) && (this.x + this.w <= mx);
  }
  if (this.h >= 0) {
    yBool = (this.y <= my) && (this.y + this.h >= my);
  } else {
    yBool = (this.y >= my) && (this.y + this.h <= my);
  }
  return (xBool && yBool);
};

// Determine if a point is inside the shape's handles
Shape.prototype.touchedAtHandles = function(mx, my) {
  // 1. top left handle
  if (checkCloseEnough(mx, this.x, this.closeEnough) && checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 2. top right handle
  else if (checkCloseEnough(mx, this.x + this.w, this.closeEnough) && checkCloseEnough(my, this.y, this.closeEnough)) {
    return true;
  }
  // 3. bottom left handle
  else if (checkCloseEnough(mx, this.x, this.closeEnough) && checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
  // 4. bottom right handle
  else if (checkCloseEnough(mx, this.x + this.w, this.closeEnough) && checkCloseEnough(my, this.y + this.h, this.closeEnough)) {
    return true;
  }
};

function CanvasState(canvas) {
  // **** First some setup! ****

  this.canvas = canvas;
  this.width = canvas.width;
  this.height = canvas.height;
  this.ctx = canvas.getContext('2d');
  // This complicates things a little but but fixes mouse co-ordinate problems
  // when there's a border or padding. See getMouse for more detail
  var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10) || 0;
    this.stylePaddingTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10) || 0;
    this.styleBorderLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10) || 0;
    this.styleBorderTop = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10) || 0;
  }
  // Some pages have fixed-position bars (like the stumbleupon bar) at the top or left of the page
  // They will mess up mouse coordinates and this fixes that
  var html = document.body.parentNode;
  this.htmlTop = html.offsetTop;
  this.htmlLeft = html.offsetLeft;

  // **** Keep track of state! ****

  this.valid = false; // when set to false, the canvas will redraw everything
  this.shapes = []; // the collection of things to be drawn
  this.dragging = false; // Keep track of when we are dragging
  // the current selected object. In the future we could turn this into an array for multiple selection
  this.selection = null;
  this.dragoffx = 0; // See mousedown and mousemove events for explanation
  this.dragoffy = 0;

  // **** Then events! ****

  // This is an example of a closure!
  // Right here "this" means the CanvasState. But we are making events on the Canvas itself,
  // and when the events are fired on the canvas the variable "this" is going to mean the canvas!
  // Since we still want to use this particular CanvasState in the events we have to save a reference to it.
  // This is our reference!
  var myState = this;

  //fixes a problem where double clicking causes text to get selected on the canvas
  canvas.addEventListener('selectstart', function(e) {
    e.preventDefault();
    return false;
  }, false);
  // Up, down, and move are for dragging
  canvas.addEventListener('mousedown', function(e) {
    var mouse = myState.getMouse(e);
    var mx = mouse.x;
    var my = mouse.y;
    var shapes = myState.shapes;
    var l = shapes.length;
    // tmp var if one gets selected
    var tmpSelected = false;
    for (var i = l - 1; i >= 0; i--) {
      var mySel = shapes[i];
      if (shapes[i].contains(mx, my) && tmpSelected === false) {
        // check if this shape is already selected
        if (myState.selection === mySel) {
          if (shapes[i].touchedAtHandles(mx, my)) {
            // in this case the shape is touched at the handles -> resize
            // pass event to shape event handler and begin possible resizing
            mouseDownSelected(e, mySel);
            myState.resizing = true;
          } else {
            // in this case the shape is touched, but NOT at the handles -> drag
            // Keep track of where in the object we clicked
            // so we can move it smoothly (see mousemove)
            myState.dragoffx = mx - mySel.x;
            myState.dragoffy = my - mySel.y;
            myState.dragging = true;
          }
        }
        myState.selection = mySel;
        // set the state of the shape as selected
        mySel.selected = true;
        myState.valid = false;
        tmpSelected = true;
        // return;
      } else {
        // unset the state of the shape as selected
        mySel.selected = false;
        myState.valid = false;
      }
    }
    // if no shape was touched
    if (tmpSelected === false) {
      myState.selection = null;
    }
    // havent returned means we have failed to select anything.
    // If there was an object selected, we deselect it
    // if (myState.selection) {
    //   myState.selection = null;
    //   myState.valid = false; // Need to clear the old selection border
    // }
  }, true);
  canvas.addEventListener('mousemove', function(e) {
    this.style.cursor = 'auto';
    if (myState.dragging) {
      var mouse = myState.getMouse(e);
      // We don't want to drag the object by its top-left corner, we want to drag it
      // from where we clicked. Thats why we saved the offset and use it here
      myState.selection.x = mouse.x - myState.dragoffx;
      myState.selection.y = mouse.y - myState.dragoffy;
      myState.valid = false; // Something's dragging so we must redraw
    }
    if (myState.resizing) {
      mouseMoveSelected(e, myState.selection);
    }
  }, true);
  canvas.addEventListener('mouseup', function(e) {
    myState.dragging = false;
    myState.resizing = false;
    mouseUpSelected(e);
  }, true);
  // double click for making new shapes
  canvas.addEventListener('dblclick', function(e) {
    var mouse = myState.getMouse(e);
    var r = Math.floor(Math.random()*255);
    var g = Math.floor(Math.random()*255);
    var b = Math.floor(Math.random()*255);
    myState.addShape(new Shape(mouse.x - 10, mouse.y - 10, 20, 20, 'rgba('+r+','+g+','+b+',.6)'));
  }, true);

  // mouse down handler for selected state
  mouseDownSelected = function(e, shape) {
    var mouse = myState.getMouse(e);
    var mouseX = mouse.x;
    var mouseY = mouse.y;
    var self = shape;

    // if there isn't a rect yet
    if (self.w === undefined) {
      self.x = mouseY;
      self.y = mouseX;
      myState.dragBR = true;
    }

    // if there is, check which corner
    //   (if any) was clicked
    //
    // 4 cases:
    // 1. top left
    else if (checkCloseEnough(mouseX, self.x, self.closeEnough) && checkCloseEnough(mouseY, self.y, self.closeEnough)) {
      myState.dragTL = true;
      e.target.style.cursor='nw-resize';
    }
    // 2. top right
    else if (checkCloseEnough(mouseX, self.x + self.w, self.closeEnough) && checkCloseEnough(mouseY, self.y, self.closeEnough)) {
      myState.dragTR = true;
      e.target.style.cursor='ne-resize';
    }
    // 3. bottom left
    else if (checkCloseEnough(mouseX, self.x, self.closeEnough) && checkCloseEnough(mouseY, self.y + self.h, self.closeEnough)) {
      myState.dragBL = true;
      e.target.style.cursor='sw-resize';
    }
    // 4. bottom right
    else if (checkCloseEnough(mouseX, self.x + self.w, self.closeEnough) && checkCloseEnough(mouseY, self.y + self.h, self.closeEnough)) {
      myState.dragBR = true;
      e.target.style.cursor='se-resize';
    }
    // (5.) none of them
    else {
      // handle not resizing
    }
    myState.valid = false; // something is resizing so we need to redraw
  };
  mouseUpSelected = function(e) {
    myState.dragTL = myState.dragTR = myState.dragBL = myState.dragBR = false;
  };
  mouseMoveSelected = function(e, shape) {
    var mouse = myState.getMouse(e);
    var mouseX = mouse.x;
    var mouseY = mouse.y;

    if (myState.dragTL) {
      e.target.style.cursor='nw-resize';
      // switch to top right handle
      if (((shape.x + shape.w) - mouseX) < 0) {
        myState.dragTL = false;
        myState.dragTR = true;
      }
      // switch to top bottom left
      if (((shape.y + shape.h) - mouseY) < 0) {
        myState.dragTL = false;
        myState.dragBL = true;
      }
      shape.w += shape.x - mouseX;
      shape.h += shape.y - mouseY;
      shape.x = mouseX;
      shape.y = mouseY;
    } else if (myState.dragTR) {
      e.target.style.cursor='ne-resize';
      // switch to top left handle
      if ((shape.x - mouseX) > 0) {
        myState.dragTR = false;
        myState.dragTL = true;
      }
      // switch to bottom right handle
      if (((shape.y + shape.h) - mouseY) < 0) {
        myState.dragTR = false;
        myState.dragBR = true;
      }
      shape.w = Math.abs(shape.x - mouseX);
      shape.h += shape.y - mouseY;
      shape.y = mouseY;
    } else if (myState.dragBL) {
      e.target.style.cursor='sw-resize';
      // switch to bottom right handle
      if (((shape.x + shape.w) - mouseX) < 0) {
        myState.dragBL = false;
        myState.dragBR = true;
      }
      // switch to top left handle
      if ((shape.y - mouseY) > 0) {
        myState.dragBL = false;
        myState.dragTL = true;
      }
      shape.w += shape.x - mouseX;
      shape.h = Math.abs(shape.y - mouseY);
      shape.x = mouseX;
    } else if (myState.dragBR) {
      e.target.style.cursor='se-resize';
      // switch to bottom left handle
      if ((shape.x - mouseX) > 0) {
        myState.dragBR = false;
        myState.dragBL = true;
      }
      // switch to top right handle
      if ((shape.y - mouseY) > 0) {
        myState.dragBR = false;
        myState.dragTR = true;
      }
      shape.w = Math.abs(shape.x - mouseX);
      shape.h = Math.abs(shape.y - mouseY);
    }

    myState.valid = false; // something is resizing so we need to redraw
  };
  // **** Options! ****

  this.selectionColor = '#000000';
  this.selectionWidth = 0.5;
  this.interval = 30;
  setInterval(function() {
    myState.draw();
  }, myState.interval);
}

CanvasState.prototype.addShape = function(shape) {
  this.shapes.push(shape);
  this.valid = false;
};

CanvasState.prototype.clear = function() {
  this.ctx.clearRect(0, 0, this.width, this.height);
};

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
CanvasState.prototype.draw = function() {
  // if our state is invalid, redraw and validate!
  if (!this.valid) {
    var ctx = this.ctx;
    var shapes = this.shapes;
    this.clear();

    // ** Add stuff you want drawn in the background all the time here **

    // draw all shapes
    var l = shapes.length;
    for (var i = 0; i < l; i++) {
      var shape = shapes[i];
      if (this.selection !== shape) {
        // draw this shape as last
        // We can skip the drawing of elements that have moved off the screen:
        if (shape.x > this.width || shape.y > this.height ||
          shape.x + shape.w < 0 || shape.y + shape.h < 0) continue;
        shapes[i].draw(ctx);
      }
    }
    // draw selected shape
    if (this.selection !== null) {
      this.selection.draw(ctx);
    }

    // draw selection
    // right now this is just a stroke along the edge of the selected Shape
    if (this.selection !== null) {
      ctx.strokeStyle = this.selectionColor;
      ctx.lineWidth = this.selectionWidth;
      var mySel = this.selection;
      ctx.strokeRect(mySel.x, mySel.y, mySel.w, mySel.h);
    }

    // ** Add stuff you want drawn on top all the time here **

    this.valid = true;
  }
};


// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
CanvasState.prototype.getMouse = function(e) {
  var element = this.canvas,
    offsetX = 0,
    offsetY = 0,
    mx, my;

  // Compute the total offset
  if (element.offsetParent !== undefined) {
    do {
      offsetX += element.offsetLeft;
      offsetY += element.offsetTop;
    } while ((element = element.offsetParent));
  }

  // Add padding and border style widths to offset
  // Also add the <html> offsets in case there's a position:fixed bar
  offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
  offsetY += this.stylePaddingTop + this.styleBorderTop + this.htmlTop;

  mx = e.pageX - offsetX;
  my = e.pageY - offsetY;

  // We return a simple javascript object (a hash) with x and y defined
  return {
    x: mx,
    y: my
  };
};

// If you dont want to use <body onLoad='init()'>
// You could uncomment this init() reference and place the script reference inside the body tag
//init();

function init() {
  var s = new CanvasState(document.getElementById('canvas1'));
  s.addShape(new Shape(40, 40, 50, 50)); // The default is gray
  s.addShape(new Shape(60, 140, 40, 60, 'lightskyblue'));
  // Lets make some partially transparent
  s.addShape(new Shape(80, 150, 60, 30, 'rgba(127, 255, 212, .5)'));
  s.addShape(new Shape(125, 80, 30, 80, 'rgba(245, 222, 179, .7)'));
}

// Draws a white rectangle with a black border around it
drawRectWithBorder = function(x, y, sideLength, ctx) {
  ctx.save();
  ctx.fillStyle = "#000000";
  ctx.fillRect(x - (sideLength / 2), y - (sideLength / 2), sideLength, sideLength);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(x - ((sideLength - 1) / 2), y - ((sideLength - 1) / 2), sideLength - 1, sideLength - 1);
  ctx.restore();
};

// checks if two points are close enough to each other depending on the closeEnough param
function checkCloseEnough(p1, p2, closeEnough) {
  return Math.abs(p1 - p2) < closeEnough;
}

// Now go make something amazing!