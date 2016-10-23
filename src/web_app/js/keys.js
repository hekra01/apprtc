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

  processKeyDown = function(eventType, event)
  {
    // MSIE hack
    if (window.event)
    {
      event = window.event;
    }

    var canSend = false;
    if (canSend && KEYS.hasOwnProperty(event.keyCode)) {
      var key = "KPRESSED,65363," + KEYS[event.keyCode] + '\n'+ "KRELEASED,65363," + KEYS[event.keyCode] + '\n';
      // TODO  send kSocket.send(key);
    }
  };
  document.addEventListener("keydown", processKeyDown, false);
// ###################### END KEY PROCESSING