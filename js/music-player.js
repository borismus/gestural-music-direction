var raf = window.webkitRequestAnimationFrame;
/**
 * Abstraction around the Web Audio API to play music at specific time
 * signatures and tempos.
 *
 * Usage:
 *  // Set 3/4 time and 120 BPM.
 *  mp.setTimeSignature(3); mp.setTempo(120);
 *  mp.play();
 *
 *  // ...Eventually the song accelerates.
 *  mp.setTempo(150);
 *  // This automatically changes the playbackRate on the source.
 *
 *  // Eventually the time signature changes.
 *  mp.setTimeSignature(4);
 *  // This automatically crossfades to the 4/4 song without changing BPM.
 *
 *  // Once in a while, resync the primary beat.
 *  mp.syncBeat();
 *
 *  // Eventually, stop the whole thing.
 *  mp.stop();
 */
function MusicPlayer() {
  // URL of the song resource.
  this.SONG_URL = 'snd/4-4-phantom.mp3';
  // Time between beats in the song.
  this.SONG_BEAT_DELTA = 0.4688;

  this.tempo = 60/this.SONG_BEAT_DELTA;
  this.ts = 2;
  this.fps = 60;
  this.scheduleAheadTime = 0.01;
  this.loopTimeout = 10;
  this.isEndFade = true;
  this.isLoaded = false;
  this.callbacks = {};

  // Load the audio buffer.
  this.loadSong_(this.SONG_URL, this.didSongLoad.bind(this));
}

MusicPlayer.prototype.didSongLoad = function() {
  this.isLoaded = true;
};

MusicPlayer.prototype.play = function() {
  if (!this.isLoaded) {
    console.error('Attempt to play song before loaded.');
    return;
  }
  this.isPlaying = true;
  this.grainOffset = 0;
  this.nextNoteTime = audioContext.currentTime;
  this.loop_();
};

MusicPlayer.prototype.stop = function() {
  this.isPlaying = false;
};

MusicPlayer.prototype.toggle = function() {
  this.isPlaying ? this.stop() : this.play();
}

MusicPlayer.prototype.setTempo = function(tempo) {
  this.tempo = tempo;
};

MusicPlayer.prototype.setTimeSignature = function(ts) {
  this.ts = ts;
};

MusicPlayer.prototype.onLoaded = function(callback) {
  this.callback = callback;
};

MusicPlayer.prototype.syncBeat = function() {
  var secondsPerBeat = 60.0 / this.tempo;
  this.nextNoteTime = audioContext.currentTime + secondsPerBeat;
  var rate = this.getPlaybackRate_();
  this.grainOffset = this.grainOffset + secondsPerBeat*rate;
};

MusicPlayer.prototype.loop_ = function() {
  // Schedule the next bar if it's not yet scheduled.
  while (this.nextNoteTime < audioContext.currentTime + this.scheduleAheadTime) {
    this.scheduleSegment_(this.grainOffset, this.nextNoteTime);
    this.nextNote_();
  }
  // Loop if we're still playing.
  if (this.isPlaying) {
    setTimeout(this.loop_.bind(this), this.loopTimeout);
  }
};

MusicPlayer.prototype.scheduleSegment_ = function(grainOffset, time) {
  // Get the part of the buffer that we're going to play.
  var source = audioContext.createBufferSource();
  var gain = audioContext.createGainNode();
  var analyser = audioContext.createAnalyser();
  source.buffer = this.buffer;
  source.connect(gain);
  gain.connect(analyser);
  analyser.minDecibels = -140;
  analyser.maxDecibels = 0;
  analyser.connect(audioContext.destination);
  this.analyser = analyser;

  var rate = this.getPlaybackRate_();
  source.playbackRate.value = rate;

  var secondsPerBeat = 60.0 / this.tempo;
  // Do a quick fade-out to minimize weird artifacts.
  if (this.isEndFade) {
    var endTime = time + secondsPerBeat;
    gain.gain.setValueAtTime(1, endTime - 0.05);
    gain.gain.linearRampToValueAtTime(0, endTime);
  }

  source.noteGrainOn(time, grainOffset, secondsPerBeat*rate);
  if (this.callbacks.beat) {
    this.callbacks.beat();
  }
}

MusicPlayer.prototype.nextNote_ = function() {
  // Advance current note and time by a 16th note...
  var secondsPerBeat = 60.0 / this.tempo;
  // Notice this picks up the CURRENT tempo value to calculate beat length.
  this.nextNoteTime += secondsPerBeat;
  // Get the next grain.
  var rate = this.getPlaybackRate_();
  this.grainOffset += secondsPerBeat * rate;
}

MusicPlayer.prototype.loadSong_ = function(url, callback) {
  var request = new XMLHttpRequest();
  request.responseType = "arraybuffer";
  request.open("GET", url, true);
  request.onload = function() {
    audioContext.decodeAudioData(
      request.response,
      function(buffer) {
        this.buffer = buffer;
        if (callback) {
          callback();
        }
      }.bind(this),
      function(error) {
        console.error('decodeAudioData error', error);
      }
    );
  }.bind(this);
  request.send();
};

MusicPlayer.prototype.getPlaybackRate_ = function() {
  var nativeTempo = 60/this.SONG_BEAT_DELTA;
  return this.tempo/120;
};

/**
 * Returns the FFT bins.
 */
MusicPlayer.prototype.getFrequencyBins = function() {
  if (!this.isPlaying) {
    return [];
  }
  var freqs = new Uint8Array(this.analyser.frequencyBinCount);
  this.analyser.getByteFrequencyData(freqs);
  return freqs;
};
