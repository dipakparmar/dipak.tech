# Vendored: demucs-web

These files (`fft.js`, `constants.js`, `processor.js`, `index.js`) are copied
verbatim from [demucs-web](https://github.com/timcsy/demucs-web) v1.0.2 by
timcsy, released under the MIT License (see `LICENSE`).

They implement the HTDemucs source-separation DSP: pure-JS STFT/iSTFT, segment
loop, and overlap-add. We vendor rather than `npm install` so a single-author
package going stale can't break our build, and so the code lives in our repo in
our style. Our own code (worker, UI) wraps `DemucsProcessor` from here.

`onnxruntime-web` is the only runtime dependency.

To re-sync with upstream: `npm pack demucs-web`, diff `src/*.js` against these.
