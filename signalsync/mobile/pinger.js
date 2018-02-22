/* global WebSocket, performance, location */
/* eslint-disable no-unused-vars */

class Pinger {
  constructor (text, canvas) {
    this.text = text;
    this.ctx = canvas.getContext('2d');
    this.ws = null;
    this.meanPing = this.meanOffset = 0;
    this.timeOrigin = performance.timeOrigin;
    if (!this.timeOrigin) {
      this.timeOrigin = new Date().getTime() - performance.now();
    }
  }

  connect () {
    this.text.innerHTML = 'Connecting...';
    this.ws = new WebSocket('ws' + location.href.substr(4) + 'ws');
    this.ws.onopen = this.connected.bind(this);
    this.ws.onmessage = this.msgReceived.bind(this);
    this.ws.onclose = this.disconnected.bind(this);
  }

  disconnect () {
    this.ws.onmessage = null;
    this.ws.onclose = null;
    this.ws.close();
    this.ws = null;
  }

  sendPing () {
    this.ws && this.ws.send('' + (performance.now() + this.timeOrigin));
  }

  setOffset () {
    this.ws && this.ws.send('set ' + Math.floor(this.meanOffset));
  }

  connected () {
    this.pings = [];
    this.meanPing = this.meanOffset = 0;
    this.sendPing();
  }

  drawPings () {
    if (!this.ws) return; // we're already done here
    var size = this.ctx.canvas.width;
    var pg = this.pings;
    if (pg.length > size) {
      pg = pg.slice(pg.length - size);
    }
    if (!pg.length) return; // might be hidden
    this.ctx.clearRect(0, 0, size, size);
    this.ctx.strokeStyle = '#FF4136';
    this.ctx.beginPath();
    this.ctx.moveTo(0, size - 1 - (pg[0][0] - pg[0][1]) * size / 1000);
    var i = 1;
    for (; i < pg.length; i++) {
      let point = pg[i];
      this.ctx.lineTo(i, size - 1 - (point[0] - point[1]) * size / 1000);
    }
    this.ctx.stroke();
    this.text.innerHTML = (
      'Net latency: ' + Math.floor(this.meanPing) + 'ms<br>' +
      'Time offset: ' + Math.floor(this.meanOffset) + 'ms'
    );
  }

  // -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=:[ events

  disconnected (evt) {
    this.text.innerHTML = 'Disconnected, trying to reconnect...';
    setTimeout(this.connect.bind(this), 5000);
  }

  msgReceived (evt) {
    var response = evt.data.split(' ');
    if (response[0] === 'status') {
      this.done && this.done(response[1], response.slice(2).join(' '));
      this.disconnect();
      return;
    }
    var rxTime = performance.now() + this.timeOrigin;
    var item = [rxTime, Number(response[0]), Number(response[1])];
    this.pings.push(item);
    var l = this.pings.length;
    this.meanPing = (this.meanPing * (l - 1) + item[0] - item[1]) / l;
    this.meanOffset = (
        this.meanOffset * (l - 1) + (item[0] - item[2]) - this.meanPing / 2
    ) / l;
    window.requestAnimationFrame(this.drawPings.bind(this));
    // setTimeout(() => this.sendPing(), 20);
    this.sendPing();
  }
}
