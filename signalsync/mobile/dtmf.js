/* global AudioContext, performance */
/* eslint-disable no-unused-vars */

var digits = '123a456b789c*0#d';
var F1 = [697, 770, 852, 941];
var F2 = [1209, 1336, 1477, 1633];

class DTMFGen {
  constructor (wave) {
    this.ctx = new AudioContext();
    this.timeOrigin = performance.timeOrigin;
    if (!this.timeOrigin) {
      this.timeOrigin = new Date().getTime() - performance.now();
    }
    this.timeOrigin /= 1000;
    this.offsetTo0ms = this.timeOrigin - Math.floor(this.timeOrigin);
    this.player = null;
  }

  sequence (seq, start) {
    for (var i = 0; i < seq.length; i++) {
      this.digit(seq[i], (start || 0) + 0.15 * i); // 100ms tone + 50ms gap
    }
  }

  digit (d, start) {
    var i = digits.indexOf(d);
    this.tone(F1[Math.floor(i / 4)], start);
    this.tone(F2[i % 4], start);
  }

  tone (freq, start, duration) {
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.frequency.value = freq;
    osc.start(start);
    osc.stop(start + (duration || 0.1)); // default 100ms of tone
  }

  checksum (num) {
    var retv = 10;
    while (num) {
      retv ^= (num & 0xf) ^ 0xf;
      num >>= 4;
    }
    return retv & 0xf;
  }

  makeCode (num) {
    return '#' + num + digits[this.checksum(num)];
  }

  playCode (num, start, debug) {
    var code = this.makeCode(num);
    if (debug) {
      console.log(new Date().getTime());
      console.log('dtmf: ' + code);
    }
    this.sequence(code, start);
  }

  startTones (dtmfType) {
    console.log('dtmf output type: ' + dtmfType);
    this.dtmfType = 0 + dtmfType;
    if (!this.player) {
      this.player = setInterval(() => this.scheduleCode(), 1000);
    }
  }

  stopTones () {
    if (this.player) {
      clearInterval(this.player);
      this.player = null;
    }
  }

  scheduleCode () {
    var t = performance.now() / 1000;
    var code = Math.floor(t + this.timeOrigin + 1);
    var time = Math.floor(t + this.offsetTo0ms + 1);
    // start += this.ctx.currentTime;
    if (this.dtmfType === 2) {
      code %= 10000;
    } else if (time % 3 !== 0) {
      return;
    }
    this.playCode(code, time);
  }

  scheduleCountdown () {
    let t = this.ctx.currentTime + 1;
    console.log(t);
    for (let i = 0; i < 4; i++, t += 1.0) {
      if (i < 3) {
        this.tone(440, t, 0.5);
        this.tone(1309, t, 0.5);
        this.tone(2174, t, 0.5);
        this.tone(3040, t, 0.5);
      } else {
        this.tone(880, t, 1);
        this.tone(2606, t, 1);
        this.tone(4338, t, 1);
        this.tone(6071, t, 1);
      }
    }
  }
}
