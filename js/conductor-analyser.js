/**
 * Analyzes positions in space for directional changes.
 */
function ConductorAnalyser() {
  // Ring buffer of times, position and velocity vectors.
  this.history = new RingBuffer(32);
  // History of sudden changes in direction (angles and times)
  this.dirChanges = new RingBuffer(32);
  // History of recent time signature estimations.
  this.tsEstimates = new RingBuffer(16);
  // History of recent BPM estimates.
  this.bpmEstimates = new RingBuffer(16);

  // Threshold for directional change.
  this.DIRECTION_THRESHOLD = 50;
  // Minimum number of points needed to do analysis.
  this.ANALYSIS_MIN_POINTS = 20;
  // Is it fast enough.
  this.FAST_ENOUGH = 4;
  // How many direction changes to use in order to estimate time signature.
  this.TIME_SIGNATURE_BUFFER = 16;
  // Shortest realistic amount of time between direction changes.
  this.MIN_DIRCHANGE_DELTA = 100;
  // Longest amount of time between direction changes that are associated with
  // one another.
  this.MAX_DIRCHANGE_DELTA = 2000;

  // Current pattern.
  this.pattern = null;
  // Current BPM.
  this.bpm = -1;

  // The k-means clusterer.
  this.clusterizer = new Clusterizer();

  // Callback list.
  this.callbacks = {};
}

ConductorAnalyser.prototype.add = function(x, y) {
  var data = {};
  // Convert to a real point.
  data.position = new Point(x, y);
  // Keep track of when the point was added.
  data.time = new Date();
  // Compute velocity vectors if previous point exists.
  var prevPoint = this.history.get(this.history.length - 1);
  if (prevPoint) {
    data.velocity = data.position.delta(prevPoint.position);
    if (prevPoint.velocity) {
      data.acceleration = data.velocity.delta(prevPoint.velocity);
    }
  }

  // Add this point to the history buffer.
  this.history.set(this.history.length, data);
  // Look for extreme points where the direction changes.
  this._analyzeDirChanges();
  // Cluster those directional changes.
  this._doClustering();
  // Estimate parameters based on the clustered data.
  this._estimateBeatsPerMinute();
  this._estimateTimeSignature();
}

ConductorAnalyser.prototype._computeMode = function(array) {
  var freq = {};
  var mode = -1;
  var maxCount = 0;
  for (var i = 0; i < array.length; i++) {
    var val = array[i];
    if (freq[val] === undefined) {
      freq[val] = 0;
    }
    freq[val] += 1;
    if (freq[val] > maxCount) {
      mode = val;
      maxCount = freq[val];
    }
  }
  return mode;
};

ConductorAnalyser.prototype.getAnalysis = function() {
  return {
    tempo: this.bpm,
    timeSignature: this.ts
  }
};

ConductorAnalyser.prototype.onDirChange = function(callback) {
  this.callbacks.dirchange = callback;
};

ConductorAnalyser.prototype._analyzeDirChanges = function() {
  if (!this._isReady()) {
    return;
  }
  // Compare the currently average direction to the previous average
  // direction. If they are significantly different, this must be a
  // sudden directional change. Record it as a feature.
  // Get the speed from the last data point.
  var lastPoint = this.history.get(this.history.length - 1);
  var speed = lastPoint.velocity.mag2();
  var isFastEnough = speed > this.FAST_ENOUGH;
  // Discard very fast accelerations (leap glitches) and very small ones
  // (constant speed movement in a straight line).
  var accel = lastPoint.acceleration.mag2();
  var isAccelReasonable = 1 < accel && accel < 1000;

  if (isFastEnough && isAccelReasonable) {
    var direction = this._computeAverageDirection();
    var angleDelta = this._angularDiff(direction, this.lastDirection)
    var isDirectionChange = angleDelta > this.DIRECTION_THRESHOLD;
    if (isDirectionChange) {
      var previousDirChange = this.dirChanges.get(this.dirChanges.length - 1);
      if (previousDirChange) {
        // Discard unreasonably fast dir changes.
        var dirChangeDelta = lastPoint.time - previousDirChange.time;
        if (dirChangeDelta < this.MIN_DIRCHANGE_DELTA) {
          return;
        }
        // Check if the direction change happens much later than everything else,
        // we should clear the whole dirChange buffer.
        if (dirChangeDelta > this.MAX_DIRCHANGE_DELTA) {
          this.dirChanges.clear();
        }
      }
      // Get the last data point.
      var dirChange = new DirectionChange({
        angle: direction,
        time: lastPoint.time,
        position: lastPoint.position
      });
      this.dirChanges.set(this.dirChanges.length, dirChange);
      if (this.callbacks.dirchange) {
        this.callbacks.dirchange();
      }
    }
    this.lastDirection = direction;
  }
}

ConductorAnalyser.prototype._isReady = function() {
  return this.history.length >= this.ANALYSIS_MIN_POINTS;
};

ConductorAnalyser.prototype._getPointAt = function(offset) {
  return this.history.get(this.history.length - offset);
}

ConductorAnalyser.prototype._computeAverageDirection = function(opts) {
  opts = opts || {};
  var start = opts.start || 2;
  var end = opts.end || 0;
  var sumX = 0;
  var sumY = 0;

  for (var i = start; i > end; i--) {
    var point = this._getPointAt(i);
    // Sum all of the velocities.
    sumX += point.velocity.x;
    sumY += point.velocity.y;
  }
  // Compute the angle of the summed velocity vectors.
  var p = new Point(sumX, sumY);
  return p.angle();
}

ConductorAnalyser.prototype._computeAverageSpeed = function(opts) {
  opts = opts || {};
  var start = opts.start || 10;
  var end = opts.end || 0;
  var sum = 0;

  for (var i = start; i > end; i--) {
    var point = this._getPointAt(i);
    if (!point || !point.velocity) {
      return;
    }
    sum += point.velocity.mag2();
  }
  return sum / (start - end);
}

ConductorAnalyser.prototype._doClustering = function() {
  // Convert the array of DirectionChanges into a clusterable format.
  var data = [];
  var startIndex = Math.max(0, this.dirChanges.length - this.TIME_SIGNATURE_BUFFER);
  for (var i = startIndex; i < this.dirChanges.length; i++) {
    var dc = this.dirChanges.get(i);
    data.push({
      point: dc.position,
      value: dc
    });
  }
  // Cluster existing direction change positions using k-means.
  var clustering = this.clusterizer.cluster(data);
  // Save the clustering as a parameter for other methods to use.
  this.lastClustering = clustering;
};

ConductorAnalyser.prototype._estimateTimeSignature = function(opts) {
  // Need a clustering to proceed.
  if (!this.lastClustering) {
    return;
  }
  var clustering = this.lastClustering;
  var clusterCount = clustering.centroids.length;
  // Keep track of a histogram of TS estimates over the last N frames.
  this.tsEstimates.set(this.tsEstimates.length, clusterCount);
  // Take the mode as the estimate.
  var tsMode = this._computeMode(this.tsEstimates._array);
  // If the new mode is different from the old time signature,
  // we have a new estimate!
  if (tsMode != this.ts) {
    this.ts = tsMode;
  }
}

/**
 * Based on the last clustering, take a look at the average differences between
 * adjacent (in time) points in each cluster.
 */
ConductorAnalyser.prototype._estimatePeriod = function(opts) {
  // Need a clustering to proceed.
  if (!this.lastClustering) {
    return;
  }

  // First, get the top cluster (smallest Y coordinate).
  var centroids = this.lastClustering.centroids;
  var topCentroidIndex = -1;
  var topCentroidY = Infinity;
  for (var i = 0; i < centroids.length; i++) {
    var c = centroids[i];
    if (c.y < topCentroidY) {
      topCentroidY = c.y;
      topCentroidIndex = i;
    }
  }

  // Now get the top centroid cluster, and compute the average time deltas
  // between members of that cluster.
  var topCluster = this.lastClustering.clustered[topCentroidIndex];
  // Get all of the times from this cluster into an array.
  var times = [];
  for (var i = 0; i < topCluster.length; i++) {
    times.push(topCluster[i].value.time);
  }
  var avgTime = this._averageTimeDelta(times);
  this.bpmEstimates.set(this.bpmEstimates.length, avgTime);
  // Take the mode as the estimate.
  var bpmMode = this._computeMode(this.bpmEstimates._array);
  // If the new mode is different from the old time signature,
  // we have a new estimate!
  if (bpmMode != this.bpm) {
    this.bpm = bpmMode;
  }
}

ConductorAnalyser.prototype._estimateBeatsPerMinute = function(opts) {
  // Get all of the times from the list of direction changes.
  var times = [];
  var lastIndex = this.dirChanges.length;
  var lookback = 8;
  var firstIndex = Math.max(0, lastIndex - lookback);
  for (var i = firstIndex; i < lastIndex; i++) {
    var dc = this.dirChanges.get(i);
    if (dc !== undefined) {
      times.push(dc.time);
    }
  }
  this.bpm = this._averageTimeDelta(times);
};

/**
 * Given a set of data points (likely from a single cluster), compute the
 * average time delta between adjacent data points.
 */
ConductorAnalyser.prototype._averageTimeDelta = function(data) {
  // If there isn't even a single pair, we don't have enough data to do anything.
  if (data.length < 2) {
    return;
  }
  var sum = 0;
  // Go through the data, comparing adjacent times.
  for (var i = 0; i + 1 < data.length; i++) {
    var t1 = data[i];
    var t2 = data[i + 1];
    sum += t2 - t1;
  }
  var averagePeriod = sum / Math.floor(data.length - 1);
  return Math.floor((60/averagePeriod) * 1000);
};

ConductorAnalyser.prototype._angularDiff = function(a1, a2) {
  var angle = (Math.abs(a1 - a2))%360;
  if(angle > 180) {
    angle = 360 - angle;
  }
  return angle;
}

function DirectionChange(opts) {
  opts = opts || {};

  this.angle = opts.angle;
  this.time = opts.time;
  this.position = opts.position;
}
