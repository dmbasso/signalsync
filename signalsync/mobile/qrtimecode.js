/* global QRCodeModel, QRErrorCorrectLevel, performance, _getTypeNumber */
/* eslint-disable no-unused-vars */

const alpha = 1 / 30;

class QRTimeCode {
  constructor () {
    this.payload = null;
    this.mean_dt = 0;
    this.done = false;
    this.textTime = document.getElementById('textTime');
    this.timeOrigin = performance.timeOrigin;
    this.last_t = performance.now();
    if (!this.timeOrigin) {
      this.timeOrigin = new Date().getTime() - this.last_t;
    }
    this.setupQR();
    this.qrReady = false;
    this.updateInfo();
    window.requestAnimationFrame(ts => this.showFrame(ts));
  }

  setupQR () {
    this.qrShow = document.getElementById('qr-show').getContext('2d');
    this.qrShow.imageSmoothingEnabled = false;
    this.size = this.qrShow.canvas.width;
    this.qrDrawElem = document.getElementById('qr-draw');
    this.drawCanvas = this.qrDrawElem.getContext('2d');
  }

  updateInfo () {
    var epochts = Math.floor(this.timeOrigin + this.last_t + this.mean_dt);
    var csum = 0;
    var digits = epochts;
    while (digits) {
      csum += digits % 10;
      digits = Math.floor(digits / 10);
    }
    var qrcode = (
      '' + (epochts / 1000).toFixed(3) +
      '#' + Number(csum).toString(16) +
      '&' + this.mean_dt.toFixed(1)
    );
    var ctime = new Date(epochts).toISOString();
    ctime = ctime.replace(/[TZ]/g, ' ');
    this.legend = ctime + '\n' + qrcode;
    // this.legend += '\n' + new Date().getTime();
    if (this.payload) {
      qrcode += ' ' + this.payload;
    }
    let d = this.drawCanvas;
    let qr = new QRCodeModel(
      _getTypeNumber(qrcode, QRErrorCorrectLevel.M), QRErrorCorrectLevel.M
    );
    qr.addData(qrcode);
    qr.make();
    var w = qr.getModuleCount();
    d.canvas.width = w;
    d.canvas.height = w;
    for (var row = 0; row < w; row++) {
      for (var col = 0; col < w; col++) {
        if (qr.isDark(row, col)) {
          d.fillRect(col, row, 1, 1);
        }
      }
    }
    this.qrReady = true;
  }

  showFrame (ts) {
    if (this.qrReady) {
      this.qrShow.clearRect(0, 0, this.size, this.size);
      this.qrShow.drawImage(this.qrDrawElem, 0, 0, this.size, this.size);
      this.textTime.innerText = this.legend;
      let t = performance.now();
      this.mean_dt = alpha * (t - this.last_t) + (1 - alpha) * this.mean_dt;
      this.last_t = t;
      this.qrReady = false;
      Promise.resolve().then(() => this.updateInfo());  // called on next tick
    }
    if (!this.done) window.requestAnimationFrame(ts => this.showFrame(ts));
  }
}
