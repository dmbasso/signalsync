var digits = '123a456b789c*0#d';
var F1 = [697, 770, 852, 941];
var F2 = [1209, 1336, 1477, 1633];

var DTMFGen = (function() {
  var DTMFGen = function(wave) {
    this.ctx = new AudioContext();
  };

  DTMFGen.prototype.sequence = function(seq, start) {
    for (var i = 0; i < seq.length; i++) {
      this.digit(seq[i], (start || 0) + 0.15 * i); // 100ms tone + 50ms gap
    }
  }

  DTMFGen.prototype.digit = function(d, start) {
    var i = digits.indexOf(d);
    this.tone(F1[Math.floor(i / 4)], start);
    this.tone(F2[i % 4], start);
  }

  DTMFGen.prototype.tone = function(freq, start) {
    var osc = this.ctx.createOscillator();
    var gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    start += this.ctx.currentTime;
    osc.frequency.value = freq;
    osc.start(start);
    osc.stop(start + 0.1); // 100ms of tone
  };

  DTMFGen.prototype.checksum = function(num) {
    var retv = 10;
    while (num) {
      retv ^= (num & 0xf) ^ 0xf;
      num >>= 4;
    }
    return retv & 0xf;
  }

  DTMFGen.prototype.makeCode = function(num) {
    return "#" + num + digits[this.checksum(num)];
  }

  DTMFGen.prototype.playCode = function(num, start, debug) {
    var code = this.makeCode(num);
    if (debug) {
      console.log("dtmf: " + code);
    }
    this.sequence(code, start);
  }

  return DTMFGen;
})();
