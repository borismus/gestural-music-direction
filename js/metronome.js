// Based heavily on Chris Wilson's sample. Added an ability to change
// time signatures too, and resync to a "now" beat.

function Metronome() {
  this.isPlaying = false;
  this.scheduleAheadTime = 0.1;
  this.NOTE_LENGTH = 0.05;
  this.lookahead = 25;
  this.currentNote = null;

  this.tempo = 120;
  this.ts = 4;
}

Metronome.prototype.play = function() {
  this.isPlaying = !this.isPlaying;

  if (this.isPlaying) { // start playing
    this.currentNote = 0;
    this.nextNoteTime = audioContext.currentTime;
    this.scheduler_();	// kick off scheduling
  } else {
    clearTimeout(this.timer);
  }
};

Metronome.prototype.setTempo = function(tempo) {
  this.tempo = tempo;
};

Metronome.prototype.setTimeSignature = function(ts) {
  this.ts = ts;
};

Metronome.prototype.scheduler_ = function() {
  // while there are notes that will need to play before the next interval,
  // schedule them and advance the pointer.
  while (this.nextNoteTime < audioContext.currentTime + this.scheduleAheadTime ) {
    this.scheduleNote_(this.currentNote, this.nextNoteTime);
    this.nextNote_();
  }
  this.timer = setTimeout(this.scheduler_.bind(this), this.lookahead);
}

Metronome.prototype.nextNote_ = function() {
  // Advance current note and time by a 16th note...
  var secondsPerBeat = 60.0 / this.tempo;
  // Notice this picks up the CURRENT tempo value to calculate beat length.
  this.nextNoteTime += secondsPerBeat;	// Add beat length to last beat time

  this.currentNote++;	// Advance the beat number, wrap to zero
  if (this.currentNote >= this.ts) {
    this.currentNote = 0;
  }
}

Metronome.prototype.scheduleNote_ = function(beatNumber, time) {
  // Create an oscillator
  var osc = audioContext.createOscillator();
  osc.connect(audioContext.destination);
  if (!(beatNumber % this.ts)) {
    osc.frequency.value = 660.0;
  } else {
    osc.frequency.value = 880.0;
  }

  osc.noteOn(time);
  osc.noteOff(time + this.NOTE_LENGTH);
}

/**
 * Syncs the beat to *right now*.
 */
Metronome.prototype.syncBeat = function() {
  console.log(this.nextNoteTime);
  // Change nextNoteTime to be aligned to the current time.
  var secondsPerBeat = 60.0 / this.tempo;
  this.nextNoteTime = audioContext.currentTime + secondsPerBeat;
};
