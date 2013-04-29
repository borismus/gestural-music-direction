/**
 * A convenience library that retrieves songs with a specific tempo and
 * time signature.
 *
 * Relevant EchoNest call:
 * http://developer.echonest.com/api/v4/song/search
 *    ?api_key=UVHMX4MMKDDWNWYWP
 *    &results=1
 *    &min_tempo=118
 *    &max_tempo=120
 *    &song_min_hotttnesss=0.7
 *    &bucket=id:spotify-WW
 *    &bucket=tracks
 *    &bucket=audio_summary
 *
 * Unfortunately it's impossible to link Rdio or Spotify to a web audio
 * stream.
 *
 * Alternative: use the web audio API directly. Pick from a set of songs
 * at various tempos and time signatures. For starters, just pick one
 * song of each time signature, and adjust tempo synthetically via
 * playbackRate.
 *
 * Crossfade between songs as TS changes.
 *
 * 3/4 songs http://goo.gl/XuJlp
 */
function EchoNestInterface() {
}

EchoNestInterface.prototype.findBestSong(tempo, timeSignature) {
};
