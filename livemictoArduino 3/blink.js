var connectionId = -1;
var readBuffer = "";


function setPosition(position) {
  var buffer = new ArrayBuffer(1);
  var uint8View = new Uint8Array(buffer);
  uint8View[0] = position;
  chrome.serial.send(connectionId, buffer, function() {});
};


function onOpen(openInfo) {
  connectionId = openInfo.connectionId;
  console.log("connectionId: " + connectionId);
  if (connectionId == -1) {
    setStatus('Could not open');
    return;
  }
  setStatus('Connected');

  setPosition(0);

  // chrome.serial.onReceive.addListener(function(data){
    
  //   var uint8View = new Uint8Array(data.data);
  //   var value = String.fromCharCode(uint8View[1]);
  //     // console.log("our data",data.data.byteLength);
  //     console.log("uint8View", value);
  //   if (value == "a") // Light on and off
  // {
  //     console.log("CMD[a]: " + readBuffer);
  //     var opat = isNaN(parseInt(readBuffer)) ? 0 : parseInt(readBuffer);
      
  //     document.getElementById('image').style.opacity = (opat* 0.7) + 0.3;
  //     readBuffer = "";
  // }
  // else if (value == "b") // Return blink length value
  // {
  //     readBuffer = "";
  // }
  // else if (value == "c") // Blink Count
  // {
  //     console.log("CMD[c]: " + readBuffer);
  //     document.getElementById('blinkCount').innerText = readBuffer;
  //     readBuffer = "";
  // }
  // else
  // {
    
  //   readBuffer += value;
  // }

  // });
};

function setStatus(status) {
  document.getElementById('status').innerText = status;
}

// original
// function buildPortPicker(ports) {
//   var eligiblePorts = ports.filter(function(port) {
//     return !port.match(/[Bb]luetooth/) && port.match(/\/dev\/tty/);
//   });

// modified
function buildPortPicker(ports) {
  var eligiblePorts = ports;
  

  var portPicker = document.getElementById('port-picker');
  eligiblePorts.forEach(function(port) {
    var portOption = document.createElement('option');
    portOption.value = portOption.innerText = port.path;
    portPicker.appendChild(portOption);
  });

  portPicker.onchange = function() {
    if (connectionId != -1) {
      chrome.serial.disconnect(connectionId, openSelectedPort);
      return;
    }
    openSelectedPort();
  };
}

function openSelectedPort() {
  var portPicker = document.getElementById('port-picker');
  var selectedPort = portPicker.options[portPicker.selectedIndex].value;
  console.log("selectedPort:", selectedPort);
  chrome.serial.connect(selectedPort, onOpen);
}

window.addEventListener("load", function() {

  document.getElementById('position-input').onchange = function() {
    setPosition(parseInt(this.value, 10));
  };

  // window.AudioContext = window.AudioContext ||
  //                       window.webkitAudioContext;

  // var context = new AudioContext();



  // chrome.serial.getDevices(function(ports) {
  //   console.log("hello", ports);
  //   buildPortPicker(ports)
  //   openSelectedPort();
  // });


  var onGetDevices = function(ports) {
      buildPortPicker(ports);
      openSelectedPort();
    }

  chrome.serial.getDevices(onGetDevices);
  console.log("bust a move");


});
