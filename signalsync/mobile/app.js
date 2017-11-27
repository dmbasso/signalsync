var dtmf = new DTMFGen();
var dtmfType = 0;
var referenceTime = 0;
var timeOffset = 0;
var lastTime;
var textTime;
var setupFrameTime = 50; // ms


function playCode(time) {
  if (dtmfType == 2) {
    time %= 10000;
  } else {
    if (time % 3 != 0)
      return;
  }
  dtmf.playCode(time, setupFrameTime / 1000);
}

function updateInfo() {
  var d = new Date();
  var cur = Math.floor( // epoch at the time of display
    (d.getTime() + timeOffset + 50 + setupFrameTime) / 1000
  );
  if (cur == lastTime) {
    return;
  }
  if (dtmfType) {
    playCode(cur);
  }
  var csum = 0,
    t = cur;
  while (t) {
    csum += t % 10;
    t = Math.floor(t / 10);
  }
  var code = "" + cur + "#" + Number(csum).toString(16);
  textTime.innerHTML = new Date(cur * 1000).toISOString() + "<br/>" + code;
  lastTime = cur;
  QR.draw(code);
}


function showFrame() {
  QR.show();
  // console.log("frame shown: " + (new Date().getTime()));
}

function setupApp() {
  var screenHeight = window.innerHeight;
  var textHeight = document.getElementById('text').clientHeight;
  var w = window.innerWidth;
  var h = screenHeight - textHeight - 20;
  QR.setup(h < w ? h : w);
  textTime = document.getElementById('textTime');
  if (window.location.hash[0] == "#") {
    referenceTime = Math.floor(window.location.hash.substr(1));
    console.log("Reference time: " + referenceTime);
    console.log("Current time  : " + (new Date().getTime()));
    timeOffset = new Date().getTime() - referenceTime;
    console.log("Time offset   : " + timeOffset);
  }
  var delay = 1000 - (new Date().getTime() + timeOffset) % 1000;
  setTimeout(function() {
    setInterval(updateInfo, 1000);
  }, delay - 1 - setupFrameTime);
  setTimeout(function() {
    setInterval(showFrame, 1000);
  }, delay - 1);
}

function selectDTMFOutput() {
  // dtmfType = (dtmfType + 1) % 3;
  dtmfType = (dtmfType + 1) % 2;
  console.log("dtmf output type: " + dtmfType)
}

function scrollToTop() {
  window.scrollTo(0, 0);
}
