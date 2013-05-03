/**
 * The whole page is a square grid of colors (maybe 16x16)
 * On the bottom: a frequency spectrum (all colors but red)
 * Where your mouse/leap moves:
 *   dir changes: red pulses.
 *   clusters: blocky circle outlines made out of the grid.
 */
function Visualizer(canvas) {
  this.blockWidth = 32;
  this.freqBlockHeight = 10;
  this.freqColorRange = 0.75;
  this.clusterRadius = 250;

  this.canvas = canvas;
  this.ctx = canvas.getContext('2d');

  this.precompute_();
}

Visualizer.prototype.precompute_ = function() {
  // Figure out the size of grid needed to fit enough blocks along the width.
  this.squareSize = this.canvas.width / this.blockWidth;
  // Calculate how many vertical blocks will be needed to fill in the whole
  // screen.
  this.blockHeight = Math.round(this.canvas.height / this.squareSize + 0.5);

  this.ctx.fillStyle = 'black';
  this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
};

Visualizer.prototype.drawGrid = function() {
  // Draw the whole grid.
  for (var i = 0; i < this.blockWidth; i++) {
    for (var j = 0; j < this.blockHeight; j++) {
      // Draw the square at [i,j].
      this.colorSquare(i, j, {
        stroke: 'rgba(50, 50, 50, 0.1)',
        fill: 'rgba(20, 20, 20, 0.05)'
      });
    }
  }
};

Visualizer.prototype.drawCluster = function(x, y) {
  // Draw a circle-like thing around the specified coordinates.
  var ci = Math.floor(x / this.squareSize);
  var cj = Math.floor(y / this.squareSize);
  // Scan through a square area around the center.
  var r = Math.floor(this.clusterRadius/this.squareSize);
  for (var i = ci - r; i < ci + r; i++) {
    for (var j = cj - r; j < cj + r; j++) {
      // For each square, determine if it's close enough to the center.
      if (this.distance(i,j, ci,cj) < r) {
        // If it is, color it a certain way.
        this.colorSquare(i, j, {fill: 'rgba(150, 0, 0, 0.1)'});
      }
    }
  }
};

Visualizer.prototype.distance = function(x1, y1, x2, y2) {
  var dx = x1 - x2;
  var dy = y1 - y2;
  return Math.sqrt(dx*dx + dy*dy);
};

Visualizer.prototype.drawDirectionChange = function(x, y) {
  // Figure out which square to activate.
  var i = Math.floor(x / this.squareSize);
  var j = Math.floor(y / this.squareSize);
  // Render that square in red.
  this.colorSquare(i, j, {fill: 'red'});
};

Visualizer.prototype.drawAudioVisualization = function(bins) {
  // Go through the grid horizontally and sample the bins accordingly.
  for (var i = 0; i < this.blockWidth; i++) {
    var percent = i/this.blockWidth;
    var binIndex = Math.floor(bins.length * percent);
    var value = bins[binIndex];
    // Calculate how many blocks tall each bin should be.
    var blocksTall = Math.pow(value / 255, 2) * this.freqBlockHeight;
    // Decide what color the column should be.
    var range = this.freqColorRange;
    var hue = (percent*range+ (1 - range)/2) * 360;
    var fill = 'hsl(' + hue + ', 100%, 50%)';
    // Color the whole column that color.
    this.colorColumn(i, blocksTall, {fill: fill});
  }
};

Visualizer.prototype.colorSquare = function(i, j, opts) {
  opts = opts || {};
  var stroke = opts.stroke || null;
  var fill = opts.fill || null;

  var size = Math.round(this.squareSize);
  this.ctx.lineWidth = 1;
  if (fill) {
    this.ctx.fillStyle = fill;
    this.ctx.fillRect(i * size, j * size, size, size);
  }
  if (stroke) {
    this.ctx.strokeStyle = stroke;
    this.ctx.strokeRect(i * size, j * size, size, size);
  } 
};

Visualizer.prototype.colorColumn = function(i, height, opts) {
  // Start from the last row, and go height rows up.
  var lastRow = this.blockHeight - 1;
  for (var row = lastRow; row >= lastRow - height; row--) {
    this.colorSquare(i, row, opts);
  }
};

Visualizer.prototype.drawPoint = function(x, y) {
  this.ctx.lineWidth = 3;
  this.ctx.strokeStyle = 'white';
  this.ctx.beginPath();
  if (this.lastX && this.lastY) {
    this.ctx.moveTo(this.lastX, this.lastY);
  }
  this.ctx.lineTo(x, y);
  this.ctx.stroke();
  this.lastX = x;
  this.lastY = y;
}

Visualizer.prototype.drawText = function(text, pos) {
  var y = 50;
  this.ctx.fillStyle = 'white';
  this.ctx.font = '20px "Press Start 2P"';
  var textMetrics = this.ctx.measureText(text);
  // Center this text.
  var padding = (this.canvas.width - textMetrics.width)/2;
  if (pos == 'bottom') {
    y = this.canvas.height - 20;
    this.ctx.fillStyle = 'black';
    this.ctx.strokeStyle = 'white';
    this.ctx.strokeText(text, padding, y);
  }
  this.ctx.fillText(text, padding, y);
}
