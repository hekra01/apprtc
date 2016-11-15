/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals trace, InfoBox, setUpFullScreen, isFullScreen,
   RoomSelection, isChromeApp, $ */
/* exported AppController, remoteVideo */

'use strict';

// TODO(jiayl): remove |remoteVideo| once the chrome browser tests are updated.
// Do not use in the production code.
var remoteVideo = $('#remote-video');

// Keep this in sync with the HTML element id attributes. Keep it sorted.
var UI_CONSTANTS = {
  confirmJoinButton: '#confirm-join-button',
  confirmJoinDiv: '#confirm-join-div',
  confirmJoinRoomSpan: '#confirm-join-room-span',
  fullscreenSvg: '#fullscreen',
  hangupSvg: '#hangup',
  icons: '#icons',
  infoDiv: '#info-div',
  localVideo: '#local-video',
  miniVideo: '#mini-video',
  muteAudioSvg: '#mute-audio',
  muteVideoSvg: '#mute-video',
  newRoomButton: '#new-room-button',
  newRoomLink: '#new-room-link',
  privacyLinks: '#privacy',
  remoteVideo: '#remote-video',
  rejoinButton: '#rejoin-button',
  rejoinDiv: '#rejoin-div',
  rejoinLink: '#rejoin-link',
  roomLinkHref: '#room-link-href',
  roomSelectionDiv: '#room-selection',
  roomSelectionInput: '#room-id-input',
  roomSelectionInputLabel: '#room-id-input-label',
  roomSelectionJoinButton: '#join-button',
  roomSelectionRandomButton: '#random-button',
  roomSelectionRecentList: '#recent-rooms-list',
  sharingDiv: '#sharing-div',
  statusDiv: '#status-div',
  videosDiv: '#videos',
};

// The controller that connects the Call with the UI.
var AppController = function(loadingParams) {
  trace('Initializing; server= ' + loadingParams.roomServer + '.');
  trace('Initializing; room=' + loadingParams.roomId + '.');
  this.hangupSvg_ = $(UI_CONSTANTS.hangupSvg);
  this.icons_ = $(UI_CONSTANTS.icons);
  this.localVideo_ = $(UI_CONSTANTS.localVideo);
  this.miniVideo_ = $(UI_CONSTANTS.miniVideo);
  this.sharingDiv_ = $(UI_CONSTANTS.sharingDiv);
  this.statusDiv_ = $(UI_CONSTANTS.statusDiv);
  this.remoteVideo_ = $(UI_CONSTANTS.remoteVideo);
  this.videosDiv_ = $(UI_CONSTANTS.videosDiv);
  this.roomLinkHref_ = $(UI_CONSTANTS.roomLinkHref);
  this.rejoinDiv_ = $(UI_CONSTANTS.rejoinDiv);
  this.rejoinLink_ = $(UI_CONSTANTS.rejoinLink);
  this.newRoomLink_ = $(UI_CONSTANTS.newRoomLink);
  this.rejoinButton_ = $(UI_CONSTANTS.rejoinButton);
  this.newRoomButton_ = $(UI_CONSTANTS.newRoomButton);

  this.newRoomButton_.addEventListener('click',
      this.onNewRoomClick_.bind(this), false);
  this.rejoinButton_.addEventListener('click',
      this.onRejoinClick_.bind(this), false);
  this.videosDiv_.addEventListener(
      'click', this.onVideoClick_.bind(this), false);

  this.muteAudioIconSet_ =
      new AppController.IconSet_(UI_CONSTANTS.muteAudioSvg);
  this.muteVideoIconSet_ =
      new AppController.IconSet_(UI_CONSTANTS.muteVideoSvg);
  this.fullscreenIconSet_ =
      new AppController.IconSet_(UI_CONSTANTS.fullscreenSvg);

  this.loadingParams_ = loadingParams;
  this.loadUrlParams_();

  var paramsPromise = Promise.resolve({});
  if (this.loadingParams_.paramsFunction) {
    // If we have a paramsFunction value, we need to call it
    // and use the returned values to merge with the passed
    // in params. In the Chrome app, this is used to initialize
    // the app with params from the server.
    paramsPromise = this.loadingParams_.paramsFunction();
  }

  Promise.resolve(paramsPromise).then(function(newParams) {
    // Merge newly retrieved params with loadingParams.
    if (newParams) {
      Object.keys(newParams).forEach(function(key) {
        this.loadingParams_[key] = newParams[key];
      }.bind(this));
    }

    this.roomLink_ = '';
    this.roomSelection_ = null;
    this.localStream_ = null;
    this.remoteVideoResetTimer_ = null;

    // If the params has a roomId specified, we should connect to that room
    // immediately. If not, show the room selection UI.
    if (this.loadingParams_.roomId) {
      this.createCall_();

      // Ask the user to confirm.
      if (!RoomSelection.matchRandomRoomPattern(this.loadingParams_.roomId)) {
        // Show the room name only if it does not match the random room pattern.
        $(UI_CONSTANTS.confirmJoinRoomSpan).textContent = ' "' +
            this.loadingParams_.roomId + '"';
      }
      var confirmJoinDiv = $(UI_CONSTANTS.confirmJoinDiv);
      this.show_(confirmJoinDiv);

      $(UI_CONSTANTS.confirmJoinButton).onclick = function() {
        this.hide_(confirmJoinDiv);

        // Record this room in the recently used list.
        var recentlyUsedList = new RoomSelection.RecentlyUsedList();
        recentlyUsedList.pushRecentRoom(this.loadingParams_.roomId);
        this.finishCallSetup_(this.loadingParams_.roomId);
      }.bind(this);

      if (this.loadingParams_.bypassJoinConfirmation) {
        $(UI_CONSTANTS.confirmJoinButton).onclick();
      }
    } else {
      // Display the room selection UI.
      this.showRoomSelection_();
    }
  }.bind(this)).catch(function(error) {
    trace('Error initializing: ' + error.message);
  }.bind(this));
};

AppController.prototype.createCall_ = function() {
  var privacyLinks = $(UI_CONSTANTS.privacyLinks);
  this.hide_(privacyLinks);
  this.call_ = new Call(this.loadingParams_);
  this.infoBox_ = new InfoBox($(UI_CONSTANTS.infoDiv),
                              this.remoteVideo_,
                              this.call_,
                              this.loadingParams_.versionInfo);

  var roomErrors = this.loadingParams_.errorMessages;
  var roomWarnings = this.loadingParams_.warningMessages;
  if (roomErrors && roomErrors.length > 0) {
    for (var i = 0; i < roomErrors.length; ++i) {
      this.infoBox_.pushErrorMessage(roomErrors[i]);
    }
    return;
  } else if (roomWarnings && roomWarnings.length > 0) {
    for (var j = 0; j < roomWarnings.length; ++j) {
      this.infoBox_.pushWarningMessage(roomWarnings[j]);
    }
  }

  // TODO(jiayl): replace callbacks with events.
  this.call_.onremotehangup = this.onRemoteHangup_.bind(this);
  this.call_.onremotesdpset = this.onRemoteSdpSet_.bind(this);
  this.call_.onremotestreamadded = this.onRemoteStreamAdded_.bind(this);
  this.call_.onlocalstreamadded = this.onLocalStreamAdded_.bind(this);

  this.call_.onsignalingstatechange =
      this.infoBox_.updateInfoDiv.bind(this.infoBox_);
  this.call_.oniceconnectionstatechange =
      this.infoBox_.updateInfoDiv.bind(this.infoBox_);
  this.call_.onnewicecandidate =
      this.infoBox_.recordIceCandidateTypes.bind(this.infoBox_);

  this.call_.onerror = this.displayError_.bind(this);
  this.call_.onstatusmessage = this.displayStatus_.bind(this);
  this.call_.oncallerstarted = this.displaySharingInfo_.bind(this);
};

AppController.prototype.showRoomSelection_ = function() {
  var roomSelectionDiv = $(UI_CONSTANTS.roomSelectionDiv);
  this.roomSelection_ = new RoomSelection(roomSelectionDiv, UI_CONSTANTS);

  this.show_(roomSelectionDiv);
  this.roomSelection_.onRoomSelected = function(roomName) {
    this.hide_(roomSelectionDiv);
    this.createCall_();
    this.finishCallSetup_(roomName);

    this.roomSelection_.removeEventListeners();
    this.roomSelection_ = null;
    if (this.localStream_) {
      this.attachLocalStream_();
    }
  }.bind(this);
};

AppController.prototype.setupUi_ = function() {
  this.iconEventSetup_();
  document.onkeydown = this.onKeyPress_.bind(this);
  window.onmousemove = this.showIcons_.bind(this);

  $(UI_CONSTANTS.muteAudioSvg).onclick = this.toggleAudioMute_.bind(this);
  $(UI_CONSTANTS.muteVideoSvg).onclick = this.toggleVideoMute_.bind(this);
  $(UI_CONSTANTS.fullscreenSvg).onclick = this.toggleFullScreen_.bind(this);
  $(UI_CONSTANTS.hangupSvg).onclick = this.hangup_.bind(this);

  setUpFullScreen();
};

AppController.prototype.finishCallSetup_ = function(roomId) {
  this.call_.start(roomId);
  this.setupUi_();

  if (!isChromeApp()) {
    // Call hangup with async = false. Required to complete multiple
    // clean up steps before page is closed.
    // Chrome apps can't use onbeforeunload.
    window.onbeforeunload = function() {
      this.call_.hangup(false);
    }.bind(this);

    window.onpopstate = function(event) {
      if (!event.state) {
        // TODO (chuckhays) : Resetting back to room selection page not
        // yet supported, reload the initial page instead.
        trace('Reloading main page.');
        location.href = location.origin;
      } else {
        // This could be a forward request to open a room again.
        if (event.state.roomLink) {
          location.href = event.state.roomLink;
        }
      }
    };
  }
};

AppController.prototype.hangup_ = function() {
  trace('Hanging up.');
  this.hide_(this.icons_);
  this.displayStatus_('Hanging up');
  this.transitionToDone_();

  // Call hangup with async = true.
  this.call_.hangup(true);
  // Reset key and mouse event handlers.
  document.onkeydown = null;
  window.onmousemove = null;
};

AppController.prototype.onRemoteHangup_ = function() {
  this.displayStatus_('The remote side hung up.');
  this.transitionToWaiting_();

  this.call_.onRemoteHangup();
};

AppController.prototype.onRemoteSdpSet_ = function(hasRemoteVideo) {
  if (hasRemoteVideo) {
    trace('Waiting for remote video.');
    this.waitForRemoteVideo_();
  } else {
    trace('No remote video stream; not waiting for media to arrive.');
    // TODO(juberti): Make this wait for ICE connection before transitioning.
    this.transitionToActive_();
  }
};

AppController.prototype.waitForRemoteVideo_ = function() {
  // Wait for the actual video to start arriving before moving to the active
  // call state.
  if (this.remoteVideo_.readyState >= 2) {  // i.e. can play
    trace('Remote video started; currentTime: ' +
          this.remoteVideo_.currentTime);
    this.transitionToActive_();
  } else {
    this.remoteVideo_.oncanplay = this.waitForRemoteVideo_.bind(this);
  }
};

AppController.prototype.onRemoteStreamAdded_ = function(stream) {
  this.deactivate_(this.sharingDiv_);
  trace('Remote stream added.');
  this.remoteVideo_.srcObject = stream;

  if (this.remoteVideoResetTimer_) {
    clearTimeout(this.remoteVideoResetTimer_);
    this.remoteVideoResetTimer_ = null;
  }
};

AppController.prototype.onLocalStreamAdded_ = function(stream) {
  trace('User has granted access to local media.');
  this.localStream_ = stream;

  if (!this.roomSelection_) {
    this.attachLocalStream_();
  }
};

AppController.prototype.attachLocalStream_ = function() {
  trace('Attaching local stream.');
  this.localVideo_.srcObject = this.localStream_;

  this.displayStatus_('');
  this.activate_(this.localVideo_);
  this.show_(this.icons_);
  if (this.localStream_.getVideoTracks().length === 0) {
    this.hide_($(UI_CONSTANTS.muteVideoSvg));
  }
  if (this.localStream_.getAudioTracks().length === 0) {
    this.hide_($(UI_CONSTANTS.muteAudioSvg));
  }
};

AppController.prototype.transitionToActive_ = function() {
  // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;
  var connectTime = window.performance.now();
  this.infoBox_.setSetupTimes(this.call_.startTime, connectTime);
  this.infoBox_.updateInfoDiv();
  trace('Call setup time: ' + (connectTime - this.call_.startTime).toFixed(0) +
      'ms.');

  // Prepare the remote video and PIP elements.
  trace('reattachMediaStream: ' + this.localVideo_.srcObject);
  this.miniVideo_.srcObject = this.localVideo_.srcObject;

  // Transition opacity from 0 to 1 for the remote and mini videos.
  this.activate_(this.remoteVideo_);
  //this.activate_(this.miniVideo_);
  // Transition opacity from 1 to 0 for the local video.
  this.deactivate_(this.localVideo_);
  this.localVideo_.srcObject = null;
  // Rotate the div containing the videos 180 deg with a CSS transform.
  this.activate_(this.videosDiv_);
  this.show_(this.hangupSvg_);
  this.displayStatus_('');
  this.deactivate_(this.sharingDiv_);
};

AppController.prototype.transitionToWaiting_ = function() {
  // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;

  this.hide_(this.hangupSvg_);
  // Rotate the div containing the videos -180 deg with a CSS transform.
  this.deactivate_(this.videosDiv_);

  if (!this.remoteVideoResetTimer_) {
    this.remoteVideoResetTimer_ = setTimeout(function() {
      this.remoteVideoResetTimer_ = null;
      trace('Resetting remoteVideo src after transitioning to waiting.');
      this.remoteVideo_.srcObject = null;
    }.bind(this), 800);
  }

  // Set localVideo.srcObject now so that the local stream won't be lost if the
  // call is restarted before the timeout.
  this.localVideo_.srcObject = this.miniVideo_.srcObject;

  // Transition opacity from 0 to 1 for the local video.
  this.activate_(this.localVideo_);
  // Transition opacity from 1 to 0 for the remote and mini videos.
  this.deactivate_(this.remoteVideo_);
  this.deactivate_(this.miniVideo_);
  this.activate_(this.sharingDiv_);
};

AppController.prototype.transitionToDone_ = function() {
  // Stop waiting for remote video.
  this.remoteVideo_.oncanplay = undefined;
  this.deactivate_(this.localVideo_);
  this.deactivate_(this.remoteVideo_);
  this.deactivate_(this.miniVideo_);
  this.hide_(this.hangupSvg_);
  this.activate_(this.rejoinDiv_);
  this.show_(this.rejoinDiv_);
  this.displayStatus_('');
};

AppController.prototype.onRejoinClick_ = function() {
  this.deactivate_(this.rejoinDiv_);
  this.hide_(this.rejoinDiv_);
  this.call_.restart();
  this.setupUi_();
};

AppController.prototype.onNewRoomClick_ = function() {
  this.deactivate_(this.rejoinDiv_);
  this.hide_(this.rejoinDiv_);
  this.showRoomSelection_();
};

AppController.prototype.innerWidth_ = function() {
   return window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth||0;
}

AppController.prototype.innerHeight_ = function() {
   return window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight||0;
}


AppController.prototype.onVideoClick_ = function(event) {
  console.log("video click " + event.x + " " + event.y + " " + this.remoteVideo_.videoWidth + " " + this.remoteVideo_.videoHeight);
  var x = event.x;
  var y = event.y;
  var iw = this.innerWidth_();
  var ih = this.innerHeight_();
  var aspectRatio_ = 16/9;
  var vx, vy, vw, vh;

  if (true || this.remoteVideo_.style.objectFit === "contain") {
    if (ih * aspectRatio_  < iw) {
      //Centered horizontally
      vh = ih;
      vw = ih * aspectRatio_;
      vx = (iw - vw) / 2;
      vy = 0;
    }
    else {
      //Centered vertically
      vw = iw;
      vh = vw / aspectRatio_;
      vx = 0;
      vy = (ih - vh) / 2;
    }

    var inside = x >= vx  && x <= vx + vw && y >= vy && y <= vy + vh;
    if (!inside)
      return;
    x = (x - vx)/ vw;
    y = (y - vy) / vh;
  }
  else {
    //TODO cover
  }

  var cmd = "MDOWN," + x + "," + y + '\n' + "MUP," + x + "," + y + '\n';

  if (this.remoteVideo_ && this.remoteVideo_.readyState >= 2)
    this.call_.sendData(cmd);
};

// Spacebar, or m: toggle audio mute.
// c: toggle camera(video) mute.
// f: toggle fullscreen.
// i: toggle info panel.
// q: quit (hangup)
// Return false to screen out original Chrome shortcuts.
AppController.prototype.onKeyPress_ = function(event) {
    var c = String.fromCharCode(event.keyCode).toLowerCase();
    switch (c) {
    case ' ':
    case 'm':
      if (this.call_) {
        this.call_.toggleAudioMute();
        this.muteAudioIconSet_.toggle();
      }
      return false;
    case 'c':
      if (this.call_) {
        this.call_.toggleVideoMute();
        this.muteVideoIconSet_.toggle();
      }
      return false;
    case 'f':
      this.toggleFullScreen_();
      return false;
    case 'i':
      this.infoBox_.toggleInfoDiv();
      return false;
    case 'q':
      this.hangup_();
      return false;
    case 'l':
      this.toggleMiniVideo_();
      return false;
    default:
      break;
  }
  if (this.remoteVideo_ && this.remoteVideo_.readyState >= 2) {
    // MSIE hack
    if (window.event)
    {
      event = window.event;
    }
    var KEYS = {
      /*F4/HOME*/ 115:3,
      /*backspace/BACK*/ 8:4,
      /*ESC*/ 27:111,
      /*UP*/38:19,
      /*LEFT*/37:21,
      /*RIGHT*/39:22,
      /*DOWN*/40:20,
      /*OK/ENTER*/13:66,
      /*SPACE/PLAY*/32:62,
      /*DELETE*/ 46:67,
    };  
    var ALPHA_MIN = 65;
    var ALPHA_MAX = 90;
    var ALPHA_MIN_UPPER = 97;
    var ALPHA_MAX_UPPER = 122;
    var NUMPAD_MIN = 96;
    var NUMPAD_MAX = 105;
    var NUM_MIN = 48;
    var NUM_MAX = 57;

    var k = -1;

    if (KEYS.hasOwnProperty(event.keyCode))
      k = KEYS[event.keyCode];
    else if (event.keyCode >= ALPHA_MIN && event.keyCode <= ALPHA_MAX)
      k = event.keyCode - 36;
    else if (event.keyCode >= NUMPAD_MIN && event.keyCode <= NUMPAD_MAX)
      k = event.keyCode + 48;
    else if (event.keyCode >= NUM_MIN && event.keyCode <= NUM_MAX)
      k = event.keyCode - 41;

    if (k >= 0) {
      this.call_.sendData("KPRESSED,65363," + k + '\n'+ "KRELEASED,65363," + k + '\n');
      /* prevent OS precessing */
      return false;
    }
  }  
};

AppController.prototype.pushCallNavigation_ = function(roomId, roomLink) {
  if (!isChromeApp()) {
    window.history.pushState({'roomId': roomId, 'roomLink': roomLink},
                             roomId,
                             roomLink);
  }
};

AppController.prototype.displaySharingInfo_ = function(roomId, roomLink) {
  this.roomLinkHref_.href = roomLink;
  this.roomLinkHref_.text = roomLink;
  this.roomLink_ = roomLink;
  this.pushCallNavigation_(roomId, roomLink);
  this.activate_(this.sharingDiv_);
};

AppController.prototype.displayStatus_ = function(status) {
  if (status === '') {
    this.deactivate_(this.statusDiv_);
  } else {
    this.activate_(this.statusDiv_);
  }
  this.statusDiv_.innerHTML = status;
};

AppController.prototype.displayError_ = function(error) {
  trace(error);
  this.infoBox_.pushErrorMessage(error);
};

AppController.prototype.toggleAudioMute_ = function() {
  this.call_.toggleAudioMute();
  this.muteAudioIconSet_.toggle();
};

AppController.prototype.toggleVideoMute_ = function() {
  this.call_.toggleVideoMute();
  this.muteVideoIconSet_.toggle();
};

AppController.prototype.toggleFullScreen_ = function() {
  if (isFullScreen()) {
    trace('Exiting fullscreen.');
    document.querySelector('svg#fullscreen title').textContent =
        'Enter fullscreen';
    document.cancelFullScreen();
  } else {
    trace('Entering fullscreen.');
    document.querySelector('svg#fullscreen title').textContent =
        'Exit fullscreen';
    document.body.requestFullScreen();
  }
  this.fullscreenIconSet_.toggle();
};

AppController.prototype.toggleMiniVideo_ = function() {
  if (this.miniVideo_.classList.contains('active')) {
    this.deactivate_(this.miniVideo_);
  } else {
    this.activate_(this.miniVideo_);
  }
};

AppController.prototype.hide_ = function(element) {
  element.classList.add('hidden');
};

AppController.prototype.show_ = function(element) {
  element.classList.remove('hidden');
};

AppController.prototype.activate_ = function(element) {
  element.classList.add('active');
  /*
  if (element === this.videosDiv_) {
    element.style["width"] = this.remoteVideo_.videoWidth;
    element.style["height"] = this.remoteVideo_.videoHeight
  }*/
};

AppController.prototype.deactivate_ = function(element) {
  element.classList.remove('active');
};

AppController.prototype.showIcons_ = function() {
  if (!this.icons_.classList.contains('active')) {
    this.activate_(this.icons_);
    this.setIconTimeout_();
  }
};

AppController.prototype.hideIcons_ = function() {
  if (this.icons_.classList.contains('active')) {
    this.deactivate_(this.icons_);
  }
};

AppController.prototype.setIconTimeout_ = function() {
  if (this.hideIconsAfterTimeout) {
    window.clearTimeout.bind(this, this.hideIconsAfterTimeout);
  }
  this.hideIconsAfterTimeout =
    window.setTimeout(function() {
    this.hideIcons_();
  }.bind(this), 5000);
};

AppController.prototype.iconEventSetup_ = function() {
  this.icons_.onmouseenter = function() {
    window.clearTimeout(this.hideIconsAfterTimeout);
  }.bind(this);

  this.icons_.onmouseleave = function() {
    this.setIconTimeout_();
  }.bind(this);
};

AppController.prototype.loadUrlParams_ = function() {
  /* jscs: disable */
  /* jshint ignore:start */
  // Suppressing jshint warns about using urlParams['KEY'] instead of
  // urlParams.KEY, since we'd like to use string literals to avoid the Closure
  // compiler renaming the properties.
  var DEFAULT_VIDEO_CODEC = 'VP9';
  var urlParams = queryStringToDictionary(window.location.search);
  this.loadingParams_.audioSendBitrate = urlParams['asbr'];
  this.loadingParams_.audioSendCodec = urlParams['asc'];
  this.loadingParams_.audioRecvBitrate = urlParams['arbr'];
  this.loadingParams_.audioRecvCodec = urlParams['arc'];
  this.loadingParams_.opusMaxPbr = urlParams['opusmaxpbr'];
  this.loadingParams_.opusFec = urlParams['opusfec'];
  this.loadingParams_.opusDtx = urlParams['opusdtx'];
  this.loadingParams_.opusStereo = urlParams['stereo'];
  this.loadingParams_.videoSendBitrate = urlParams['vsbr'];
  this.loadingParams_.videoSendInitialBitrate = urlParams['vsibr'];
  this.loadingParams_.videoSendCodec = urlParams['vsc'];
  this.loadingParams_.videoRecvBitrate = urlParams['vrbr'];
  this.loadingParams_.videoRecvCodec = urlParams['vrc'] || DEFAULT_VIDEO_CODEC;
  this.loadingParams_.videoFec = urlParams['videofec'];
  /* jshint ignore:end */
  /* jscs: enable */
};

AppController.IconSet_ = function(iconSelector) {
  this.iconElement = document.querySelector(iconSelector);
};

AppController.IconSet_.prototype.toggle = function() {
  if (this.iconElement.classList.contains('on')) {
    this.iconElement.classList.remove('on');
    // turn it off: CSS hides `svg path.on` and displays `svg path.off`
  } else {
    // turn it on: CSS displays `svg.on path.on` and hides `svg.on path.off`
    this.iconElement.classList.add('on');
  }
};

/*
const AKEYCODE_UNKNOWN         = 0;
const AKEYCODE_SOFT_LEFT       = 1;
const AKEYCODE_SOFT_RIGHT      = 2;
const AKEYCODE_HOME            = 3;
const AKEYCODE_BACK            = 4;
const AKEYCODE_CALL            = 5;
const AKEYCODE_ENDCALL         = 6;
const AKEYCODE_0               = 7;
const AKEYCODE_1               = 8;
const AKEYCODE_2               = 9;
const AKEYCODE_3               = 10;
const AKEYCODE_4               = 11;
const AKEYCODE_5               = 12;
const AKEYCODE_6               = 13;
const AKEYCODE_7               = 14;
const AKEYCODE_8               = 15;
const AKEYCODE_9               = 16;
const AKEYCODE_STAR            = 17;
const AKEYCODE_POUND           = 18;
const AKEYCODE_DPAD_UP         = 19;
const AKEYCODE_DPAD_DOWN       = 20;
const AKEYCODE_DPAD_LEFT       = 21;
const AKEYCODE_DPAD_RIGHT      = 22;
const AKEYCODE_DPAD_CENTER     = 23;
const AKEYCODE_VOLUME_UP       = 24;
const AKEYCODE_VOLUME_DOWN     = 25;
const AKEYCODE_POWER           = 26;
const AKEYCODE_CAMERA          = 27;
const AKEYCODE_CLEAR           = 28;
const AKEYCODE_A               = 29;
const AKEYCODE_B               = 30;
const AKEYCODE_C               = 31;
const AKEYCODE_D               = 32;
const AKEYCODE_E               = 33;
const AKEYCODE_F               = 34;
const AKEYCODE_G               = 35;
const AKEYCODE_H               = 36;
const AKEYCODE_I               = 37;
const AKEYCODE_J               = 38;
const AKEYCODE_K               = 39;
const AKEYCODE_L               = 40;
const AKEYCODE_M               = 41;
const AKEYCODE_N               = 42;
const AKEYCODE_O               = 43;
const AKEYCODE_P               = 44;
const AKEYCODE_Q               = 45;
const AKEYCODE_R               = 46;
const AKEYCODE_S               = 47;
const AKEYCODE_T               = 48;
const AKEYCODE_U               = 49;
const AKEYCODE_V               = 50;
const AKEYCODE_W               = 51;
const AKEYCODE_X               = 52;
const AKEYCODE_Y               = 53;
const AKEYCODE_Z               = 54;
const AKEYCODE_COMMA           = 55;
const AKEYCODE_PERIOD          = 56;
const AKEYCODE_ALT_LEFT        = 57;
const AKEYCODE_ALT_RIGHT       = 58;
const AKEYCODE_SHIFT_LEFT      = 59;
const AKEYCODE_SHIFT_RIGHT     = 60;
const AKEYCODE_TAB             = 61;
const AKEYCODE_SPACE           = 62;
const AKEYCODE_SYM             = 63;
const AKEYCODE_EXPLORER        = 64;
const AKEYCODE_ENVELOPE        = 65;
const AKEYCODE_ENTER           = 66;
const AKEYCODE_DEL             = 67;
const AKEYCODE_GRAVE           = 68;
const AKEYCODE_MINUS           = 69;
const AKEYCODE_EQUALS          = 70;
const AKEYCODE_LEFT_BRACKET    = 71;
const AKEYCODE_RIGHT_BRACKET   = 72;
const AKEYCODE_BACKSLASH       = 73;
const AKEYCODE_SEMICOLON       = 74;
const AKEYCODE_APOSTROPHE      = 75;
const AKEYCODE_SLASH           = 76;
const AKEYCODE_AT              = 77;
const AKEYCODE_NUM             = 78;
const AKEYCODE_HEADSETHOOK     = 79;
const AKEYCODE_FOCUS           = 80;   // *Camera* focus
const AKEYCODE_PLUS            = 81;
const AKEYCODE_MENU            = 82;
const AKEYCODE_NOTIFICATION    = 83;
const AKEYCODE_SEARCH          = 84;
const AKEYCODE_MEDIA_PLAY_PAUSE= 85;
const AKEYCODE_MEDIA_STOP      = 86;
const AKEYCODE_MEDIA_NEXT      = 87;
const AKEYCODE_MEDIA_PREVIOUS  = 88;
const AKEYCODE_MEDIA_REWIND    = 89;
const AKEYCODE_MEDIA_FAST_FORWARD = 90;
const AKEYCODE_MUTE            = 91;
const AKEYCODE_PAGE_UP         = 92;
const AKEYCODE_PAGE_DOWN       = 93;
const AKEYCODE_PICTSYMBOLS     = 94;
const AKEYCODE_SWITCH_CHARSET  = 95;
const AKEYCODE_BUTTON_A        = 96;
const AKEYCODE_BUTTON_B        = 97;
const AKEYCODE_BUTTON_C        = 98;
const AKEYCODE_BUTTON_X        = 99;
const AKEYCODE_BUTTON_Y        = 100;
const AKEYCODE_BUTTON_Z        = 101;
const AKEYCODE_BUTTON_L1       = 102;
const AKEYCODE_BUTTON_R1       = 103;
const AKEYCODE_BUTTON_L2       = 104;
const AKEYCODE_BUTTON_R2       = 105;
const AKEYCODE_BUTTON_THUMBL   = 106;
const AKEYCODE_BUTTON_THUMBR   = 107;
const AKEYCODE_BUTTON_START    = 108;
const AKEYCODE_BUTTON_SELECT   = 109;
const AKEYCODE_BUTTON_MODE     = 110;
const AKEYCODE_ESCAPE          = 111;
const AKEYCODE_FORWARD_DEL     = 112;
const AKEYCODE_CTRL_LEFT       = 113;
const AKEYCODE_CTRL_RIGHT      = 114;
const AKEYCODE_CAPS_LOCK       = 115;
const AKEYCODE_SCROLL_LOCK     = 116;
const AKEYCODE_META_LEFT       = 117;
const AKEYCODE_META_RIGHT      = 118;
const AKEYCODE_FUNCTION        = 119;
const AKEYCODE_SYSRQ           = 120;
const AKEYCODE_BREAK           = 121;
const AKEYCODE_MOVE_HOME       = 122;
const AKEYCODE_MOVE_END        = 123;
const AKEYCODE_INSERT          = 124;
const AKEYCODE_FORWARD         = 125;
const AKEYCODE_MEDIA_PLAY      = 126;
const AKEYCODE_MEDIA_PAUSE     = 127;
const AKEYCODE_MEDIA_CLOSE     = 128;
const AKEYCODE_MEDIA_EJECT     = 129;
const AKEYCODE_MEDIA_RECORD    = 130;
const AKEYCODE_F1              = 131;
const AKEYCODE_F2              = 132;
const AKEYCODE_F3              = 133;
const AKEYCODE_F4              = 134;
const AKEYCODE_F5              = 135;
const AKEYCODE_F6              = 136;
const AKEYCODE_F7              = 137;
const AKEYCODE_F8              = 138;
const AKEYCODE_F9              = 139;
const AKEYCODE_F10             = 140;
const AKEYCODE_F11             = 141;
const AKEYCODE_F12             = 142;
const AKEYCODE_NUM_LOCK        = 143;
const AKEYCODE_NUMPAD_0        = 144;
const AKEYCODE_NUMPAD_1        = 145;
const AKEYCODE_NUMPAD_2        = 146;
const AKEYCODE_NUMPAD_3        = 147;
const AKEYCODE_NUMPAD_4        = 148;
const AKEYCODE_NUMPAD_5        = 149;
const AKEYCODE_NUMPAD_6        = 150;
const AKEYCODE_NUMPAD_7        = 151;
const AKEYCODE_NUMPAD_8        = 152;
const AKEYCODE_NUMPAD_9        = 153;
const AKEYCODE_NUMPAD_DIVIDE   = 154;
const AKEYCODE_NUMPAD_MULTIPLY = 155;
const AKEYCODE_NUMPAD_SUBTRACT = 156;
const AKEYCODE_NUMPAD_ADD      = 157;
const AKEYCODE_NUMPAD_DOT      = 158;
const AKEYCODE_NUMPAD_COMMA    = 159;
const AKEYCODE_NUMPAD_ENTER    = 160;
const AKEYCODE_NUMPAD_EQUALS   = 161;
const AKEYCODE_NUMPAD_LEFT_PAREN = 162;
const AKEYCODE_NUMPAD_RIGHT_PAREN = 163;
const AKEYCODE_VOLUME_MUTE     = 164;
const AKEYCODE_INFO            = 165;
const AKEYCODE_CHANNEL_UP      = 166;
const AKEYCODE_CHANNEL_DOWN    = 167;
const AKEYCODE_ZOOM_IN         = 168;
const AKEYCODE_ZOOM_OUT        = 169;
const AKEYCODE_TV              = 170;
const AKEYCODE_WINDOW          = 171;
const AKEYCODE_GUIDE           = 172;
const AKEYCODE_DVR             = 173;
const AKEYCODE_BOOKMARK        = 174;
const AKEYCODE_CAPTIONS        = 175;
const AKEYCODE_SETTINGS        = 176;
const AKEYCODE_TV_POWER        = 177;
const AKEYCODE_TV_INPUT        = 178;
const AKEYCODE_STB_POWER       = 179;
const AKEYCODE_STB_INPUT       = 180;
const AKEYCODE_AVR_POWER       = 181;
const AKEYCODE_AVR_INPUT       = 182;
const AKEYCODE_PROG_RED        = 183;
const AKEYCODE_PROG_GREEN      = 184;
const AKEYCODE_PROG_YELLOW     = 185;
const AKEYCODE_PROG_BLUE       = 186;
const AKEYCODE_APP_SWITCH      = 187;
const AKEYCODE_BUTTON_1        = 188;
const AKEYCODE_BUTTON_2        = 189;
const AKEYCODE_BUTTON_3        = 190;
const AKEYCODE_BUTTON_4        = 191;
const AKEYCODE_BUTTON_5        = 192;
const AKEYCODE_BUTTON_6        = 193;
const AKEYCODE_BUTTON_7        = 194;
const AKEYCODE_BUTTON_8        = 195;
const AKEYCODE_BUTTON_9        = 196;
const AKEYCODE_BUTTON_10       = 197;
const AKEYCODE_BUTTON_11       = 198;
const AKEYCODE_BUTTON_12       = 199;
const AKEYCODE_BUTTON_13       = 200;
const AKEYCODE_BUTTON_14       = 201;
const AKEYCODE_BUTTON_15       = 202;
const AKEYCODE_BUTTON_16       = 203;
const AKEYCODE_LANGUAGE_SWITCH = 204;
const AKEYCODE_MANNER_MODE     = 205;
const AKEYCODE_3D_MODE         = 206;
const AKEYCODE_CONTACTS        = 207;
const AKEYCODE_CALENDAR        = 208;
const AKEYCODE_MUSIC           = 209;
const AKEYCODE_CALCULATOR      = 210;
const AKEYCODE_ZENKAKU_HANKAKU = 211;
const AKEYCODE_EISU            = 212;
const AKEYCODE_MUHENKAN        = 213;
const AKEYCODE_HENKAN          = 214;
const AKEYCODE_KATAKANA_HIRAGANA = 215;
const AKEYCODE_YEN             = 216;
const AKEYCODE_RO              = 217;
const AKEYCODE_KANA            = 218;
const AKEYCODE_ASSIST          = 219;
const AKEYCODE_BRIGHTNESS_DOWN = 220;
const AKEYCODE_BRIGHTNESS_UP   = 221;
const AKEYCODE_MEDIA_AUDIO_TRACK = 222;
const AKEYCODE_SLEEP           = 223;
const AKEYCODE_WAKEUP          = 224;
const AKEYCODE_PAIRING         = 225;
const AKEYCODE_MEDIA_TOP_MENU  = 226;
const AKEYCODE_11              = 227;
const AKEYCODE_12              = 228;
const AKEYCODE_LAST_CHANNEL    = 229;
const AKEYCODE_TV_DATA_SERVICE = 230;
const AKEYCODE_VOICE_ASSIST    = 231;
const AKEYCODE_TV_RADIO_SERVICE = 232;
const AKEYCODE_TV_TELETEXT     = 233;
const AKEYCODE_TV_NUMBER_ENTRY = 234;
const AKEYCODE_TV_TERRESTRIAL_ANALOG = 235;
const AKEYCODE_TV_TERRESTRIAL_DIGITAL = 236;
const AKEYCODE_TV_SATELLITE    = 237;
const AKEYCODE_TV_SATELLITE_BS = 238;
const AKEYCODE_TV_SATELLITE_CS = 239;
const AKEYCODE_TV_SATELLITE_SERVICE = 240;
const AKEYCODE_TV_NETWORK      = 241;
const AKEYCODE_TV_ANTENNA_CABLE = 242;
const AKEYCODE_TV_INPUT_HDMI_1 = 243;
const AKEYCODE_TV_INPUT_HDMI_2 = 244;
const AKEYCODE_TV_INPUT_HDMI_3 = 245;
const AKEYCODE_TV_INPUT_HDMI_4 = 246;
const AKEYCODE_TV_INPUT_COMPOSITE_1 = 247;
const AKEYCODE_TV_INPUT_COMPOSITE_2 = 248;
const AKEYCODE_TV_INPUT_COMPONENT_1 = 249;
const AKEYCODE_TV_INPUT_COMPONENT_2 = 250;
const AKEYCODE_TV_INPUT_VGA_1  = 251;
const AKEYCODE_TV_AUDIO_DESCRIPTION = 252;
const AKEYCODE_TV_AUDIO_DESCRIPTION_MIX_UP = 253;
const AKEYCODE_TV_AUDIO_DESCRIPTION_MIX_DOWN = 254;
const AKEYCODE_TV_ZOOM_MODE    = 255;
const AKEYCODE_TV_CONTENTS_MENU = 256;
const AKEYCODE_TV_MEDIA_CONTEXT_MENU = 257;
const AKEYCODE_TV_TIMER_PROGRAMMING = 258;
const AKEYCODE_HELP            = 259;
*/