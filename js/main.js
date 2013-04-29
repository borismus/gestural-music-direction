// Setup pointer lock.
document.addEventListener('click', function(e) {
  document.body.webkitRequestPointerLock();
});

var x = 100;
var y = 100;

// Listen to mousemove events.
document.addEventListener('mousemove', function(e) {
  x += e.webkitMovementX;
  y += e.webkitMovementY;
});

// Listen to Leap events.
Leap.loop(function(frame, done) {
  var centerX = document.body.offsetWidth/2;
  var centerY = document.body.offsetHeight/2;
  var leapX = 0;
  var leapY = 200;
  var scaleX = 3;
  var scaleY = 2;
  if (frame.hands.length) {
    var hand = frame.hands[0];
    var unscaledX = (leapX + hand.palmPosition[0]);
    var unscaledY = (leapY + -hand.palmPosition[1]);
    x = scaleX*unscaledX + centerX;
    y = scaleY*unscaledY + centerY;
  }

  done();
})

audioContext = new webkitAudioContext();
var metronome = new MusicPlayer();


// Setup a render loop which actually draws points and feeds them into
// the analyser.
var raf = window.webkitRequestAnimationFrame;
raf(mainLoop);

function mainLoop() {
  // Gradually fade to white.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  // Plot the mouse events on the screen.
  drawPoint(x, y);
  // Feed new mouse events into the analyser.
  analyser.add(x, y);
  // Plot acceleration and velocity magnitudes over time.
  //drawVectorMagnitudes();
  // Draw cluster centroids as they happen.
  drawCentroids();
  // Draw direction change positions as they happen.
  drawDirectionChanges();

  var analysis = analyser.getAnalysis();
  if (analysis.tempo && analysis.timeSignature) {
    if (!metronome.isPlaying) {
      metronome.play();
    }
    metronome.setTempo(analysis.tempo);
    metronome.setTimeSignature(analysis.timeSignature);
  }

  // Draw the analysis on the chart itself.
  drawAnalysis(analysis);

  // Continue looping forever!
  raf(mainLoop);
}


document.addEventListener('keydown', function(e) {
  if (e.keyCode == 32) { // Space
    document.webkitExitPointerLock();
  }
})

var analyser = new ConductorAnalyser();
analyser.onDirChange(function() {
  console.log('Dir change!');
});


// Drawing stuff (for debugging).
var lastX = x;
var lastY = y;
var canvas = document.querySelector('canvas');
var ctx = canvas.getContext('2d');

function drawAnalysis(info) {
  var tsFormat = 'time: ' + (info.timeSignature ? info.timeSignature + '/4' : '?');
  var bpmFormat = 'tempo: ' + (info.tempo ? info.tempo + ' bpm' : '?');

  // Compute dimensions for the rendered analysis.
  var width = 320;
  var height = 240;
  var x = canvas.width - width - 2;
  var y = 2
  var yTs = y + 50;
  var yBpm = y + 100;
  var xPad = x + 20;
  // Clear the top right area.
  ctx.clearRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.font = '20pt monospace';
  ctx.fillStyle = 'black';
  // Render the text.
  ctx.fillText(tsFormat, xPad, yTs);
  ctx.strokeText(tsFormat, xPad, yTs);
  ctx.fillText(bpmFormat, xPad, yBpm);
  ctx.strokeText(bpmFormat, xPad, yBpm);
}

function drawCentroids() {
  // Get last clustering.
  result = analyser.lastClustering;
  if (!result) {
    return;
  }
  // Draw each centroid.
  for (var i = 0; i < result.centroids.length; i++) {
    var centroid = result.centroids[i];
    ctx.fillStyle = 'rgba(0, 0, 0, 0.005)';
    ctx.fillRect(centroid.x - 100, centroid.y - 100, 200, 200);
  }
}

function drawDirectionChanges() {
  if (analyser.dirChanges.length <= 0) {
    return;
  }
  // Draw the most recent direction change.
  var dirChange = analyser.dirChanges.get(analyser.dirChanges.length - 1);
  var point = dirChange.position;
  ctx.save();
  ctx.fillStyle = 'red';
  ctx.fillRect(point.x, point.y, 20, 20);
  ctx.restore();
}

function drawPoint(x, y) {
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'black';
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x;
  lastY = y;
}

var t = 0;
var lastSpeed = 0;
var lastDir = 0;
function drawVectorMagnitudes() {
  if (!analyser._isReady()) {
    return;
  }
  var dir = analyser._computeAverageDirection();
  var speed = analyser._computeAverageSpeed();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'red';
  ctx.beginPath();
  ctx.moveTo(t, lastSpeed);
  ctx.lineTo(t+1, speed);
  ctx.stroke();

  ctx.strokeStyle = 'blue';
  ctx.beginPath();
  ctx.moveTo(t, lastDir);
  ctx.lineTo(t+1, dir);
  ctx.stroke();


  lastDir = dir;
  lastSpeed = speed;
  t += 1;
  if (t > canvas.width) {
    canvas.width = canvas.width;
    t = 0;
  }
}

window.addEventListener('load', resize);
window.addEventListener('resize', resize);

function resize() {
  canvas.width = document.body.offsetWidth;
  canvas.height = document.body.offsetHeight;
}
