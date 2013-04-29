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
  this.tempo = 120;
  this.ts = 2;
  this.fps = 60;
  this.scheduleAheadTime = 0.01;

  // URL of the song resource.
  this.SONG_URL = 'snd/4-4-phantom.mp3';
  // Time between beats in the song.
  this.SONG_BEAT_DELTA = 0.4688;

  // Load the audio buffer.
  this.loadSong_(this.SONG_URL, function() {
    console.log('Song loaded!');
  });
}

MusicPlayer.prototype.play = function() {
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

MusicPlayer.prototype.syncBeat = function() {
  console.log('Sync beat.');
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
    raf(this.loop_.bind(this));
  }
};

MusicPlayer.prototype.scheduleSegment_ = function(grainOffset, time) {
  // Get the part of the buffer that we're going to play.
  var source = audioContext.createBufferSource();
  source.buffer = this.buffer;
  source.connect(audioContext.destination);

  var rate = this.getPlaybackRate_();
  source.playbackRate.value = rate;

  var secondsPerBeat = 60.0 / this.tempo;
  source.noteGrainOn(time, grainOffset, secondsPerBeat*rate);
  setTimeout(function() {
    console.log('Beat!');
  }, secondsPerBeat*rate * 1000);
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
