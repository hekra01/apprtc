// ###################### BEGIN KEY PROCESSING
  var KEYS = { 
      /*BACK/backspace*/ 8:4, 
      /*HOME/ESC*/ 27:111, 
      /*UP*/38:24, 
      /*LEFT*/37:21, 
      /*RIGHT*/39:22, 
      /*DOWN*/40:20, 
      /*OK/ENTER*/13:66, 
      /*PLAY/SPACE*/32:62
  };
  var kSocket, vSocket, canSend;  
  focusInput = function()
  {
    document.getElementById("input").focus();
  };
  
  clear = function()
  {
    var eventTypes = ["onkeydown", "onkeypress", "onkeyup"];
    var codeTypes = ["keycode", "charcode", "which"];
    for(var event = 0; event < eventTypes.length; event++)
    {
      for(var code = 0; code < codeTypes.length; code++)
      {
        var element = document.getElementById(eventTypes[event] + "_" + codeTypes[code]);
        while (element.firstChild != null)
        {
          element.removeChild(element.firstChild);
        }
      }
    }
  };
  
  processKeyEvent = function(eventType, event)
  {
    // MSIE hack
    if (window.event)
    {
      event = window.event;
    }
    
    var element = document.getElementById(eventType + "_keycode");
    var text = document.createTextNode("'" + event.keyCode + "'");
    element.appendChild(text);
    
    element = document.getElementById(eventType + "_charcode");
    text = document.createTextNode("'" + event.charCode + "'");
    element.appendChild(text);
  
    element = document.getElementById(eventType + "_which");
    text = document.createTextNode("'" + event.which + "'");
    element.appendChild(text);
    if (eventType == "onkeydown")
    {
      if (!kSocket) 
      {
        connect();
      }
      if (canSend && KEYS.hasOwnProperty(event.keyCode)) {
          var key = "KPRESSED,65363," + KEYS[event.keyCode] + '\n'+ "KRELEASED,65363," + KEYS[event.keyCode] + '\n';
        kSocket.send(key);
        trace("Sent to socket '" + key + "'' (" + kaddress.value + ")");
      }
    }
  };
  connect = function(s)
  {
    var kaddress = document.getElementById("kaddress").value;
    var vaddress = document.getElementById("vaddress").value;
    console.log("Websocket connect " + kaddress + " " +vaddress);
    disconnect();
    kSocket = createSocket(kaddress); 
    initVideo();
  };
  createSocket = function(address)
  {
    var socket = new WebSocket (address, 'binary'); 
    socket.onopen = function (evt) 
    {
      canSend = true;
      trace("ws socket open " + address);
    };
    socket.onclose = function (evt) 
    {
      canSend = false;
      trace("ws socket closed " + address);
      alert("Websocket closed " + address);
    };
    socket.onmessage = function (evt) 
    {
      trace(evt.data);
    };    
    return socket;
  }
  disconnect = function(s)
  {
    if (kSocket) 
    {
      kSocket.close();
      kSocket = null;
    }
    if (vSocket) 
    {
      vSocket.close();
      vSocket = null;
    }   
  };
  
  trace = function(s)
  {
    console.log("Websocket message: " + s);
  };
  processKeyDown = function(event)
  {
    clear();
    processKeyEvent("onkeydown", event);
  };
  processKeyPress = function(event)
  {
    processKeyEvent("onkeypress", event);
  };
  processKeyUp = function(event)
  {
    processKeyEvent("onkeyup", event);
  };
  initVideo = function() {
      var video = document.querySelector('video');
    var mediaSource = new MediaSource();
    var buffer;
    var queue = [];
    video.src = window.URL.createObjectURL(mediaSource);
      var address = document.getElementById("vaddress").value;
    vSocket = new WebSocket(address, 'binary');
      vSocket.binaryType = 'arraybuffer';  
    mediaSource.addEventListener('sourceopen', function(e) {
      console.log("source open");
      video.play();
      //var mime = 'video/mp4; codecs="avc1.4D4001,mp4a.40.2"'
      //var mime = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"';
      var mime = 'video/webm; codecs="vp8"';
      buffer = mediaSource.addSourceBuffer(mime);
      buffer.addEventListener('updatestart', function(e) { console.log('updatestart: ' + mediaSource.readyState); });
      buffer.addEventListener('update', function(e) { console.log('update: ' + mediaSource.readyState); });
      buffer.addEventListener('updateend', function(e) { console.log('updateend: ' + mediaSource.readyState); });
      buffer.addEventListener('error', function(e) { console.log('error: ' + mediaSource.readyState); });
      buffer.addEventListener('abort', function(e) { console.log('abort: ' + mediaSource.readyState); });
      buffer.addEventListener('update', function() { // Note: Have tried 'updateend'
        if (queue.length > 0 && !buffer.updating) {
          buffer.appendBuffer(queue.shift());
        }
      });
    }, false);
    mediaSource.addEventListener('sourceopen', function(e) { console.log('sourceopen: ' + mediaSource.readyState); });
    mediaSource.addEventListener('sourceended', function(e) { console.log('sourceended: ' + mediaSource.readyState); });
    mediaSource.addEventListener('sourceclose', function(e) { console.log('sourceclose: ' + mediaSource.readyState); });
    mediaSource.addEventListener('error', function(e) { console.log('error: ' + mediaSource.readyState); });
    vSocket.addEventListener('message', function(e) {
      console.log("on video message " + e.data);
      if (typeof e.data !== 'string') {
        if (buffer.updating || mediaSource.readyState != "open" || queue.length > 0) {
          queue.push(e.data);
        } else {
          buffer.appendBuffer(e.data);
        }
      }
    }, false);
  }
// ###################### END KEY PROCESSING