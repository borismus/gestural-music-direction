function Point(x, y) {
  this.x = x;
  this.y = y;
}

Point.prototype.delta = function(p) {
  return new Point(p.x - this.x, p.y - this.y);
}

Point.prototype.mag2 = function() {
  return this.x * this.x + this.y * this.y;
}

Point.prototype.angle = function() {
  return Math.atan2(this.y, this.x) * 180 / Math.PI;
}

Point.prototype.l2distance = function(p) {
  var dx = p.x - this.x;
  var dy = p.y - this.y;
  return Math.sqrt(dx*dx + dy*dy);
}

Point.prototype.equals = function(p) {
  return this.x == p.x && this.y == p.y;
}
