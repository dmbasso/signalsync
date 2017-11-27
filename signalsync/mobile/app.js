var dtmf = new DTMFGen();
var dtmfType = 0;
var referenceTime=0;
var timeOffset=0;
var lastTime;
var textTime;


function playCode(time) {
  time += 1;
  if (dtmfType == 2) {
    time %= 10000;
  } else {
    if (time % 3 != 0)
      return;
  }
  // dtmf.playCode(time, 0, true);
  dtmf.playCode(time, 1);
}

function updateInfo(){
  var d = new Date();
  var cur = Math.floor((d.getTime() + timeOffset + 50) / 1000);
  if (cur == lastTime) {
    return;
  }
  var csum = 0, t = cur;
  while (t) {
    csum += t % 10;
    t = Math.floor(t / 10);
  }
  var code = "" + cur + "#" + Number(csum).toString(16);
  if (dtmfType) {
    playCode(cur);
  }
  textTime.innerHTML = d.toISOString() + "<br/>" + code;
  lastTime = cur;
  doqr(code);
}


function setupApp(){
    setupqr();
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
    }, delay - 1);
}

function selectDTMFOutput() {
  // dtmfType = (dtmfType + 1) % 3;
  dtmfType = (dtmfType + 1) % 2;
  console.log("dtmf output type: " + dtmfType)
}
