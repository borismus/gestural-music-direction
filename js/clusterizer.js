/**
 * Implements a k-means algorithm to classify a data set into clusters.
 */
function Clusterizer(opts) {
  opts = opts || {};
  // The maximum number of clusters to look for.
  this.maxClusters = opts.maxClusters || 4;
}

/**
 * Main entry point for clustering.
 *
 * @param data {Array} Data is an array of objects {point, value}.
 * Point is a coordinate in space. Value is the associated datum.
 */
Clusterizer.prototype.cluster = function(data) {
  this.data = data;
  // Get the bounds for all of the data.
  this.bounds = this._getBounds();
  var bestClustering = null;
  var minError = Infinity;
  // Run the k-means cluster algorithm for k between 2 and maxClusters.
  for (var k = 2; k <= this.maxClusters; k++) {
    var clustering = this._kMeans(k);
    // Check if we have an empty cluster.
    var emptyClusters = this._countEmptyClusters();
    //console.log('Found', emptyClusters, 'empty clusters', 'with k=', k);
    if (clustering.error < minError && emptyClusters == 0) {
      bestClustering = clustering;
      minError = clustering.error;
      //console.log('Best clustering so far:', k, 'error', minError);
    }
  }
  return bestClustering;
}

/**
 * The k means clustering implementation.
 *
 * @return {Object}
 * - error {Number} computed as a sum of distances between centroid and
 *   every point in that cluster.
 * - clustered {Array} is an array of arrays corresponding to clusters.
 * - centroids {Array} contains centers of the clusters.
 */
Clusterizer.prototype._kMeans = function(k) {
  this.means = this._createRandomPoints(k);
  this._assignPointsToMeans();
  var isMeanMoved = true;
  var iter = 1;
  while (isMeanMoved) {
    isMeanMoved = this._moveMeans();
    iter += 1;
  }
  // At this point, we have finished clustering.
  var error = this._computeError();
  var clustered = this._clusterize();
  var centroids = this.means;
  //console.log(error, clustered, centroids, iter);

  return {
    error: error,
    clustered: clustered,
    centroids: centroids
  }
}

/**
 * Returns the two points outlining the bounding box containing all
 * points in the data set.
 */
Clusterizer.prototype._getBounds = function() {
  var min = new Point(Infinity, Infinity);
  var max = new Point(-Infinity, -Infinity);
  // Iterate through the data.
  for (var i = 0; i < this.data.length; i++) {
    var p = this.data[i].point;
    if (p.x < min.x) {
      min.x = p.x;
    }
    if (p.y < min.y) {
      min.y = p.y;
    }
    if (p.x > max.x) {
      max.x = p.x;
    }
    if (p.y > max.y) {
      max.y = p.y;
    }
  }
  return [min, max];
}

Clusterizer.prototype._createRandomPoints = function(k) {
  var out = [];
  while (k--) {
    // Create a random point within the allowed range.
    var x = this.bounds[0].x + Math.random() * (this.bounds[1].x - this.bounds[0].x);
    var y = this.bounds[0].y + Math.random() * (this.bounds[1].y - this.bounds[0].y);
    out.push(new Point(x, y));
  }
  return out;
}

/**
 * Helper function that assigns the closest mean to each point. Also
 * keeps track of distance between the point and that mean.
 */
Clusterizer.prototype._assignPointsToMeans = function() {
  for (var i = 0; i < this.data.length; i++) {
    var d = this.data[i];
    var point = d.point;
    var distances = [];

    // For each point, get distances from it to each of the means.
    var minDistance = Infinity;
    var closestClusterIndex = null;
    for (var j = 0; j < this.means.length; j++) {
      var mean = this.means[j];
      var distance = mean.l2distance(point);
      if (distance < minDistance) {
        minDistance = distance;
        closestClusterIndex = j;
      }
    }

    // Find which mean is closest. Assign it to the data point.
    d.clusterIndex = closestClusterIndex;
    d.clusterDistance = minDistance;
  }
}

/**
 * Moves each mean to be the average of all of the constituent points.
 * @returns true iff the means moved.
 */
Clusterizer.prototype._moveMeans = function() {
  // First, reassign all of the mean clusters.
  this._assignPointsToMeans();

  var clusters = [];
  var i;
  var isMoved = false;
  for (i = 0; i < this.means.length; i++) {
    clusters[i] = [];
  }
  // Cluster points based on their associated mean.
  for (i = 0; i < this.data.length; i++) {
    var point = this.data[i];
    clusters[point.clusterIndex].push(point);
  }
  // Compute the average position of these points.
  for (i = 0; i < clusters.length; i++) {
    var newMean = new Point(0, 0);
    var cluster = clusters[i];
    // If we have an empty cluster, ignore it.
    if (cluster.length == 0) {
      continue;
    }
    for (var j = 0; j < cluster.length; j++) {
      newMean.x += cluster[j].point.x;
      newMean.y += cluster[j].point.y;
    }
    newMean.x /= cluster.length;
    newMean.y /= cluster.length;
    // Assign the newMean to be the new mean.
    var mean = this.means[i];
    if (!newMean.equals(mean)) {
      //console.log('diff is', mean.l2distance(newMean));
      this.means[i] = newMean;
      isMoved = true;
    }
  }
  return isMoved;
}

Clusterizer.prototype._computeError = function() {
  // Go through all of the existing clusters and for each one, add up
  // all of the clusterDistances.
  var totalError = 0;
  var k = this.means.length;
  for (var i = 0; i < this.data.length; i++) {
    totalError += this.data[i].clusterDistance * k;
  }
  return totalError;
}

Clusterizer.prototype._clusterize = function() {
  var clusters = [];
  var i;
  for (i = 0; i < this.means.length; i++) {
    clusters[i] = [];
  }
  for (i = 0; i < this.data.length; i++) {
    var point = this.data[i];
    clusters[point.clusterIndex].push(point);
  }
  return clusters;
}

Clusterizer.prototype._countEmptyClusters = function() {
  var emptyCount = 0;
  var clusters = this._clusterize();
  for (i = 0; i < clusters.length; i++) {
    if (clusters[i].length === 0) {
      emptyCount += 1;
    }
  }
  return emptyCount;
}
