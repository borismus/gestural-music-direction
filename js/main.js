function init() {
  // Globals.
  canvas = document.querySelector('canvas');
  resize();

  audioContext = new webkitAudioContext();
  ctx = canvas.getContext('2d');
  viz = new Visualizer(canvas);
  analyser = new ConductorAnalyser();
  player = new MusicPlayer();
  isBeat = false;
  x = 100;
  y = 100;

  // Listen for resize.
  window.addEventListener('resize', resize);

  // Setup pointer lock.
  document.addEventListener('click', function(e) {
    document.body.webkitRequestPointerLock();
  });

  // Listen to mousemove events.
  document.addEventListener('mousemove', function(e) {
    x = clamp(x + e.webkitMovementX, [0, canvas.width]);
    y = clamp(y + e.webkitMovementY, [0, canvas.height]);
  });

  function clamp(value, range) {
    return Math.min(Math.max(value, range[0]), range[1]);
  }

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

  analyser.onDirChange(function() {
    //console.log('Dir change!');
  });

  player.callbacks.beat = function() {
    isBeat = true;
  };

  // Setup a render loop which actually draws points and feeds them into
  // the analyser.
  var raf = window.webkitRequestAnimationFrame;
  raf(mainLoop);
}

function mainLoop() {
  // Step 1: Update models, do analysis.
  var analysis = analyser.getAnalysis();
  if (analysis.tempo && analysis.timeSignature) {
    if (!player.isPlaying) {
      player.play();
    }
    player.setTempo(analysis.tempo);
    player.setTimeSignature(analysis.timeSignature);
  }
  analyser.add(x, y);

  // Step 2: Render.
  viz.drawGrid();
  if (!player.isLoaded) {
    viz.drawText('loading, please wait...');
  } else {
    if (document.webkitPointerLockElement == null) {
      viz.drawText('tip: click to pointer lock.');
    }
    // Draw cluster centroids as they happen.
    if (isBeat) {
      drawClusters();
      isBeat = false;
    }
    // Draw direction change positions as they happen.
    drawDirectionChanges();
    // Visualize the frequency spectrum.
    viz.drawAudioVisualization(player.getFrequencyBins());
    // Draw the analysis on the chart itself.
    drawAnalysis(analysis);
  }

  viz.drawPoint(x, y);

  // Continue looping forever!
  raf(mainLoop);
}

function drawAnalysis(info) {
  //var tsFormat = 'time: ' + (info.timeSignature ? info.timeSignature + '/4' : '?');
  var bpmFormat = (info.tempo ? info.tempo + ' bpm' : '?');
  viz.drawText(bpmFormat, 'bottom');
}

function drawClusters() {
  // Get last clustering.
  result = analyser.lastClustering;
  if (!result) {
    return;
  }
  // Draw each centroid.
  for (var i = 0; i < result.centroids.length; i++) {
    var centroid = result.centroids[i];
    viz.drawCluster(centroid.x, centroid.y);
  }
}

function drawDirectionChanges() {
  if (analyser.dirChanges.length <= 0) {
    return;
  }
  // Draw the most recent direction change.
  var dirChange = analyser.dirChanges.get(analyser.dirChanges.length - 1);
  var point = dirChange.position;
  viz.drawDirectionChange(point.x, point.y);
}

function resize() {
  canvas.width = document.body.offsetWidth;
  canvas.height = document.body.offsetHeight;
  viz = new Visualizer(canvas);
}

window.addEventListener('load', init);
