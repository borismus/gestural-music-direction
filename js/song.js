function Song() {
  // Time of first beat of the song WRT start of song.
  this.nativeBeatStart = 0.000;
  // Time between beats.
  this.nativeDelta = 0.4688; // Maybe 4689?
  // Time signature.
  this.timeSignature = 4;
  // URL to the actual song file.
  this.songUrl = 'snd/4-4-phantom.mp3';
  // The audio buffer of this song.
  this.buffer = null;

  this.loadSong();
}

Song.prototype.setTempo = function(targetTempo) {
  var nativeTempo = 60/this.nativeDelta;
  this.source.playbackRate.value = targetTempo/nativeTempo;
};

Song.prototype.loadSong = function() {
  var request = new XMLHttpRequest();
  request.responseType = "arraybuffer";
  request.open("GET", this.songUrl, true);
  request.onload = function() {
    audioContext.decodeAudioData(
      request.response,
      function(buffer) {
        this.buffer = buffer;
      }.bind(this),
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }.bind(this);
  request.send();
};

Song.prototype.play = function(offset) {
  // Start playing the song itself.
  var source = audioContext.createBufferSource();
  source.buffer = this.buffer;
  source.connect(audioContext.destination);
  source.start(0, offset);
  // When play was first hit.
  this.lastPlay = audioContext.currentTime;
  this.position = offset;
  this.source = source;
  return;
  // Setup a metronome to verify beat checking.
  for (var i = 0; i < 1000; i++) {
    // Make an oscillator.
    var osc = audioContext.createOscillator();
    osc.frequency.value = 440;
    osc.connect(audioContext.destination);
    // Schedule it to beep in the future.
    var start = this.nativeBeatStart + this.nativeDelta * i;
    osc.start(start);
    osc.stop(start + 0.05);
  }
};

Song.prototype.syncBeat = function() {
  // How far are we into playing the current buffer?
  var duration = audioContext.currentTime - this.lastPlay;
  var nextBeatTime = (audioContext.currentTime - this.nativeBeatStart)
      % this.nativeDelta;
  console.log('nextBeatTime', nextBeatTime);
  // Seek in the buffer to make sure that the next beat aligns.
  this.stop();
  this.play(nextBeatTime);
};
