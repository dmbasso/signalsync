/* global QRTimeCode, DTMFGen, Pinger */
/* eslint-disable no-unused-vars */

var qrShow;
var dtmf;
var dtmfType = 0;
var textTime;
var offsetRecordMode;
var pinger;
var qrtc;
var setupTries = 2;

function setupApp () {
  dtmf = new DTMFGen();
  textTime = document.getElementById('textTime');
  qrShow = document.getElementById('qr-show');
  let canvas = qrShow.getContext('2d').canvas;
  let w = document.getElementById('canvas-container').clientWidth;
  canvas.width = w;
  canvas.height = w;
  canvas.imageSmoothingEnabled = false;
  offsetRecordMode = navigator.onLine;
  if (!offsetRecordMode) {
    qrtc = new QRTimeCode();
  } else {
    canvasTouched();
  }
}

function pingerDone (status, msg) {
  console.log(status);
  console.log(msg);
  if (status === 'ok') {
    offsetRecordMode = false;
    textTime.innerHTML = 'Offset accepted!<br>Starting claquet...';
    document.getElementById('userInput').value = msg;
    qrtc = new QRTimeCode();
  } else {
    if (setupTries) {
      textTime.className = 'error';
      textTime.innerHTML = msg + '<br>Touch to try again. Ignore in ' + setupTries + ' tries.';
    } else {
      offsetRecordMode = false;
      qrtc = new QRTimeCode();
    }
    setupTries--;
  }
  pinger = null;
}

function canvasTouched () {
  if (offsetRecordMode) {
    if (!pinger) {
      textTime.className = '';
      pinger = new Pinger(textTime, qrShow);
      pinger.done = pingerDone;
      pinger.connect();
    } else {
      pinger.setOffset();
    }
    return;
  }
  document.getElementById('menu').style.display = 'flex';
  document.getElementById('mainView').style.display = 'none';
}

var camRegexp = /\b(cam\w*)\s*=\s*(\S+)/;

function userInputChanged (el) {
  console.log('uic: ' + el.value);
  var m = camRegexp.exec(el.value);
  if (m && qrtc) {
    if (qrtc.payload) {
      if (camRegexp.exec(qrtc.payload)) {
        qrtc.payload = qrtc.payload.replace(camRegexp, '$1=' + m[2]);
      } else {
        qrtc.payload += ' cam=' + m[2];
      }
    } else {
      qrtc.payload = 'cam=' + m[2];
    }
  }
  window.scrollTo(0, 0);
}

function setCamera (num) {
  var el = document.getElementById('userInput');
  var m = camRegexp.exec(el.value);
  if (!m) {
    el.value += 'camera=' + num;
  } else {
    el.value = el.value.replace(camRegexp, m[1] + '=' + num);
  }
  userInputChanged(el);
  hideMenu();
}

function setDTMF (type) {
  if (type === 3) {
    dtmf.scheduleCountdown();
  } else if (type) {
    dtmf.startTones(0 + type);
  } else {
    dtmf.stopTones();
  }
  hideMenu();
}

function hideMenu () {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('mainView').style.display = 'grid';
}

function setDataPayload () {
  if (!qrtc) return;
  var resp = window.prompt('Payload', qrtc.payload || '');
  if (resp) {
    qrtc.payload = resp;
    hideMenu();
  }
}

setupApp();
