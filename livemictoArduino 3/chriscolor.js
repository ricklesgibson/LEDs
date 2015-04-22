  var incrementor = 0;//Put in an incrementor for our frequency sample that we get back.
  var frequencyArray = []; //This is where we will store our frequencies
  var songTable = document.getElementById('songMap') //access the songmap div

  /*
The MIT License (MIT)

Copyright (c) 2014 Chris Wilson

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

window.AudioContext = window.AudioContext || window.webkitAudioContext; //assign an web audio api audio 
//context to this window

var audioContext = null; //set an audio context globally so we can access it everywhere
var isPlaying = false; //we will change this later, but declare this variable
var sourceNode = null; //create a sourcenodev ar
var analyser = null;
var theBuffer = null;
var DEBUGCANVAS = null;
var mediaStreamSource = null;
var detectorElem, 
  canvasElem,
  waveCanvas,
  pitchElem,
  noteElem,
  detuneElem,
  detuneAmount;
  var allFrequencies = [];
  var frequency_call_counter = 0; //count every time we update frequency
  var frequency_hash = {}; //we will add an array to this hash
  var pointInHash; //this will be the key for the array in the hash above
  var pitchArray = []; //Are pitches different from frequencies? THey shouldn't be

window.addEventListener("load", function() {


  toggleLiveInput();
  audioContext = new AudioContext(); //create a new audio context
  console.log("cc window load");
  MAX_SIZE = Math.max(4,Math.floor(audioContext.sampleRate/5000));  // corresponds to a 5kHz signal
  var request = new XMLHttpRequest(); //this is getting a whistiling sound for the oscillator
  //and feeds it into the frequency getter
  request.open("GET", "../sounds/whistling3.ogg", true); //open a request to the server
  request.responseType = "arraybuffer";
  request.onload = function() {
    audioContext.decodeAudioData( request.response, function(buffer) { 
        theBuffer = buffer;
    } );
  }
  request.send();

  detectorElem = document.getElementById( "detector" ); //simple DOM manipulation
  canvasElem = document.getElementById( "output" );
  DEBUGCANVAS = document.getElementById( "waveform" );
  if (DEBUGCANVAS) {
    waveCanvas = DEBUGCANVAS.getContext("2d");
    waveCanvas.strokeStyle = "black";
    waveCanvas.lineWidth = 1;
  }
  pitchElem = document.getElementById( "pitch" );
  noteElem = document.getElementById( "note" );
  detuneElem = document.getElementById( "detune" );
  detuneAmount = document.getElementById( "detune_amt" );

  detectorElem.ondragenter = function () { 
    this.classList.add("droptarget"); 
    return false; };
  detectorElem.ondragleave = function () { this.classList.remove("droptarget"); return false; };
  detectorElem.ondrop = function (e) {
      this.classList.remove("droptarget");
      e.preventDefault();
    theBuffer = null;

      var reader = new FileReader();
      reader.onload = function (event) {
        audioContext.decodeAudioData( event.target.result, function(buffer) {
          theBuffer = buffer;
        }, function(){alert("error loading!");} ); 

      };
      reader.onerror = function (event) {
        alert("Error: " + reader.error );
    };
      reader.readAsArrayBuffer(e.dataTransfer.files[0]);
      return false;
  };



});

function pitchToHSL(pitchVal){
    if(pitchVal > 6000 || pitchVal < 200){ // pitches out of this range are resonant noise
        return "badpitch";
    }
    else
        return "hsl"+"(" + ((pitchVal - 200) / 16.11111111) +",100%,50%)" ; //H in HSL values 0 through 320 (cutting out the reds on the end)
        // Pitch Range we care about is 200 - 6000
        // 5800/360 = 16.1 repeating
        //"hsl(2,50%,50%)"
}

function error() {
    alert('Stream generation failed.');
}

function getUserMedia(dictionary, callback) {
    try {
        navigator.getUserMedia = 
          navigator.getUserMedia ||
          navigator.webkitGetUserMedia ||
          navigator.mozGetUserMedia;
        navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
        alert('getUserMedia threw exception :' + e);
    }
}

function gotStream(stream) {
    // Create an AudioNode from the stream.
    mediaStreamSource = audioContext.createMediaStreamSource(stream);

    // Connect it to the destination.
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    mediaStreamSource.connect( analyser );
    updatePitch();
}

function toggleOscillator() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
        return "play oscillator";
    }
    //make an oscillating frequency node
    sourceNode = audioContext.createOscillator();

    analyser = audioContext.createAnalyser();
    //descripe the size of the Fast Fourier Transform
    //FFT size directly affects frequency resolution
    analyser.fftSize = 2048; //1024 Spectral Lines (sl = fft/2)
    //sampling rate / fft size = spectral line frequency
    sourceNode.connect( analyser );
    //add a node to analyser context
    analyser.connect( audioContext.destination );
    //destination is
    sourceNode.start(0);

    isPlaying = true;
    isLiveInput = false;
    updatePitch();

    return "stop";
}

function toggleLiveInput() {
  console.log("liveinput function");
    if (isPlaying) {n
        //stop playing and return
        sourceNode.stop( 0 );
        //
        sourceNode = null;
        analyser = null;
        isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame;
        window.cancelAnimationFrame( rafID );
    }
    getUserMedia(
      {
            "audio": {
                "mandatory": {
                    "googEchoCancellation": "false",
                    "googAutoGainControl": "false",
                    "googNoiseSuppression": "false",
                    "googHighpassFilter": "false"
                },
                "optional": []
            }
        }, gotStream);
}

function togglePlayback() {
    if (isPlaying) {
        //stop playing and return
        sourceNode.stop( 0 );
        sourceNode = null;
        analyser = null;
        isPlaying = false;
    if (!window.cancelAnimationFrame)
      window.cancelAnimationFrame = window.webkitCancelAnimationFrame; 
        window.cancelAnimationFrame( rafID );
        return "start";
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = theBuffer;
    sourceNode.loop = true;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    sourceNode.connect( analyser );
    analyser.connect( audioContext.destination );
    sourceNode.start( 0 );
    isPlaying = true;
    isLiveInput = false;
    updatePitch();

    return "stop";
}

var rafID = null;
var tracks = null;
var buflen = 1024;
var buf = new Float32Array( buflen );

var noteStrings = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
//this is an arbitrarily assigned array of colors, proof of concept for color map
var colorStrings = ["red", "orange", "yellow", "green", "blue", "purple", "black", "gray", "brown", "#F562C3", "white", "#527126"]; //these relate to notes, but eventually we want to be frequency specific
function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint16Array(buf));
}
chrome.serial.onReceive.addListener(function(x) {console.log("received: ", x.data);});
function noteFromPitch( frequency ) {
    if(pitchToHSL(frequency) != "badpitch")
    {
        frequency_call_counter++; //keep track of how many frequencies we've taken in
        allFrequencies.push(frequency); //Keep track of everything in one place
        frequencyArray.push(frequency); //push the frequency to the frequency array
        var newNode = document.createElement('div');
        newNode.id = "songNode" + frequency_call_counter;
        newNode.setAttribute("class", "songNode");
        newNode.style.width = "10px";
        newNode.style.height = "10px";
        var margTop = 0, margLeft = 0;
        margTop = Math.floor(frequency_call_counter / 100) * 10; //if we had 100, our margin top would be 10

        margLeft = (10 * frequency_call_counter) % 1000;


        (Math.ceil(frequency_call_counter / 100) * 10) - frequency_call_counter; // since divs have a width of 10
        //our margin left will be 10 * the number of divs we have so far.
        nodeTopMarg = margTop.toString();
        margg = margTop.toString() + "px " + "0px " + "0px " + margLeft.toString() + "px"; //make this readable
        //by the margine style
        newNode.style.position = "absolute"; //don't let the divs affect each other
        newNode.style.margin = margg;
        newNode.style.backgroundColor = pitchToHSL(frequency);
        // console.log(newNode.style.backgroundColor, typeof newNode.style.backgroundColor);
        // console.log(newNode.style.backgroundColor.slice(4, -1).split(','));
        colorArray = newNode.style.backgroundColor.slice(4, -1).split(',');
        console.log(colorArray);
        var bufferArray = new ArrayBuffer(4);
        var bufView=new Uint8Array(bufferArray);
        bufView[0] = parseInt(colorArray[0]);
        bufView[1] = parseInt(colorArray[1]);
        bufView[2] = parseInt(colorArray[2]);
        bufView[3] = 0;
//        console.log(bufferArray);
        chrome.serial.send(connectionId, bufferArray, function(x) {console.log(x);});

        songTable.appendChild(newNode);
    };

  if (frequencyArray.length >49){ //if our frequency array is 50 elements long
    console.log(frequencyArray); //let's console log the array
    pointInHash = "t" + frequency_call_counter / 50; //let's add a key to our hash
    frequency_hash[pointInHash] = frequencyArray; //let's add an array to our key
    console.log(frequency_hash, pointInHash); //let's console log the hash
    //at the current point in the audio snippet being taken in by the
    //web audio api
   // $.ajax({ //let's post this data back to our database
   //    type: "POST", //we are posting
   //    url: "/songmaps", //this is the url of the page
   //    dataType: "json", //we want our data to be stored as json
   //    contentType: "application/json", //this is our data type
   //    data : JSON.stringify({
   //               songmap: {  name: pointInHash.toString(),
   //                           time_frequency:frequencyArray

   //               }
   //      }),
   //    //success: function() { alert("Success!"); },
   //    error: function(err){ console.log(err)}
   //  });
    /*frequencyCall.done(function(msg){
      console.log(msg);
    });
    frequencyCall.fail(function(jqXHR, textStatus){
      console.log( "Request failed: " + textStatus);
    });*/
      frequencyArray = [];
    }
    //frequencyCall();
     //clear out the array, let's give this another shot, boys
  // Frequency in Hz
  var noteNum = 12 * (Math.log( frequency / 440 )/Math.log(2) ); //isn't math awesome?
  //12 steps in a scale, hence the 12
  //take the log of the freqeuncy divided by 400 and multiply that by the log of 2
  //and you almost get the note! How cool is that?
  return Math.round( noteNum ) + 69;
  //now let's round it and add 69 and that's the frequency of the note!
};

function frequencyFromNoteNumber( note ) {
  return 440 * Math.pow(2,(note-69)/12);
}

function centsOffFromPitch( frequency, note ) {
  return Math.floor( 1200 * Math.log( frequency / frequencyFromNoteNumber( note ))/Math.log(2) );
}

// this is a float version of the algorithm below - but it's not currently used.
/*
function autoCorrelateFloat( buf, sampleRate ) {
  var MIN_SAMPLES = 4;  // corresponds to an 11kHz signal
  var MAX_SAMPLES = 1000; // corresponds to a 44Hz signal
  var SIZE = 1000;
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;

  if (buf.length < (SIZE + MAX_SAMPLES - MIN_SAMPLES))
    return -1;  // Not enough data

  for (var i=0;i<SIZE;i++)
    rms += buf[i]*buf[i];
  rms = Math.sqrt(rms/SIZE);

  for (var offset = MIN_SAMPLES; offset <= MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i=0; i<SIZE; i++) {
      correlation += Math.abs(buf[i]-buf[i+offset]);
    }
    correlation = 1 - (correlation/SIZE);
    if (correlation > best_correlation) {
      best_correlation = correlation;
      best_offset = offset;
    }
  }
  if ((rms>0.1)&&(best_correlation > 0.1)) {
    console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")");
  }
//  var best_frequency = sampleRate/best_offset;
}
*/

var MIN_SAMPLES = 0;  // will be initialized when AudioContext is created.

function autoCorrelate( buf, sampleRate ) { //this function is constantly being called
  var SIZE = buf.length;
  var MAX_SAMPLES = Math.floor(SIZE/2);
  var best_offset = -1;
  var best_correlation = 0;
  var rms = 0;
  var foundGoodCorrelation = false;
  var correlations = new Array(MAX_SAMPLES);

  for (var i=0;i<SIZE;i++) {
    // console.log("here's buf and buf[i] and rms", buf, val, rms)
    var val = buf[i];
    rms += val*val;
  }
  rms = Math.sqrt(rms/SIZE);
  if (rms<0.01) // not enough signal
    return -1;

  var lastCorrelation=1;
  for (var offset = MIN_SAMPLES; offset < MAX_SAMPLES; offset++) {
    var correlation = 0;

    for (var i=0; i<MAX_SAMPLES; i++) {
      correlation += Math.abs((buf[i])-(buf[i+offset]));
    }
    correlation = 1 - (correlation/MAX_SAMPLES);
    correlations[offset] = correlation; // store it, for the tweaking we need to do below.
    if ((correlation>0.9) && (correlation > lastCorrelation)) {
      foundGoodCorrelation = true;
      if (correlation > best_correlation) {
        best_correlation = correlation;
        best_offset = offset;
      }
    } else if (foundGoodCorrelation) {
      // short-circuit - we found a good correlation, then a bad one, so we'd just be seeing copies from here.
      // Now we need to tweak the offset - by interpolating between the values to the left and right of the
      // best offset, and shifting it a bit.  This is complex, and HACKY in this code (happy to take PRs!) -
      // we need to do a curve fit on correlations[] around best_offset in order to better determine precise
      // (anti-aliased) offset.

      // we know best_offset >=1, 
      // since foundGoodCorrelation cannot go to true until the second pass (offset=1), and 
      // we can't drop into this clause until the following pass (else if).
      var shift = (correlations[best_offset+1] - correlations[best_offset-1])/correlations[best_offset];  
      return sampleRate/(best_offset+(8*shift));
    }
    lastCorrelation = correlation;
  }
  if (best_correlation > 0.01) {
    // console.log("f = " + sampleRate/best_offset + "Hz (rms: " + rms + " confidence: " + best_correlation + ")")
    return sampleRate/best_offset;
  }
  return -1;
//  var best_frequency = sampleRate/best_offset;
}

function updatePitch( time ) {
  var cycles = new Array;
  analyser.getFloatTimeDomainData( buf );
  var ac = autoCorrelate( buf, audioContext.sampleRate );
  // TODO: Paint confidence meter on canvasElem here.

  if (DEBUGCANVAS) {  // This draws the current waveform, useful for debugging
    waveCanvas.clearRect(0,0,512,256);
    waveCanvas.strokeStyle = "red";
    waveCanvas.beginPath();
    waveCanvas.moveTo(0,0);
    waveCanvas.lineTo(0,256);
    waveCanvas.moveTo(128,0);
    waveCanvas.lineTo(128,256);
    waveCanvas.moveTo(256,0);
    waveCanvas.lineTo(256,256);
    waveCanvas.moveTo(384,0);
    waveCanvas.lineTo(384,256);
    waveCanvas.moveTo(512,0);
    waveCanvas.lineTo(512,256);
    waveCanvas.stroke();
    waveCanvas.strokeStyle = "black";
    waveCanvas.beginPath();
    waveCanvas.moveTo(0,buf[0]);
    for (var i=1;i<512;i++) {
      waveCanvas.lineTo(i,128+(buf[i]*128));
    }
    waveCanvas.stroke();
  }

  if (ac == -1) {
      detectorElem.className = "vague";
      pitchElem.innerText = "--";
      noteElem.innerText = "-";
      detuneElem.className = "";
      detuneAmount.innerText = "--";
  }
  else {
      detectorElem.className = "confident";
      pitch = ac;
      pitchArray.push(pitch);
      pitchElem.innerText = Math.round(pitch);
      var note = noteFromPitch(pitch);
      noteElem.innerHTML = noteStrings[note % 12];
      colorContainer = document.getElementById('colorContainer');
      colorContainer.style.backgroundColor = colorStrings[note % 12];
      incrementor++;
      // if (incrementor == 50) {
      //  console.log(incrementor);
      //  incrementor = 0;
      //  };

      var detune = centsOffFromPitch(pitch, note);
      if (detune == 0) {
          detuneElem.className = "";
          detuneAmount.innerHTML = "--";
      } else {
          if (detune < 0)
              detuneElem.className = "flat";
          else
              detuneElem.className = "sharp";

          detuneAmount.innerHTML = Math.abs(detune);
      }
  }

  if (!window.requestAnimationFrame)
    window.requestAnimationFrame = window.webkitRequestAnimationFrame;

  rafID = window.requestAnimationFrame( updatePitch );
}