const socket = io('/')
const form = document.querySelector("#chatform");
const userform = document.querySelector("#userform");
const messages = document.querySelector("#messages");
const feedback = document.querySelector("#feedback");
const videoGrid = document.getElementById('video-grid');
const themeIcons = document.querySelectorAll(".theme-icon");
const barIcons = document.querySelectorAll(".bar-icon");
const muteIcon = document.querySelector(".mute");
const stopIcon = document.querySelector(".stop");
const peer = new Peer(undefined, {
  host: '/',
  // port: '443',
  port: '3000',
  path: '/peerjs'
})
const peers = {}
let localVideoStream, typing = true, throttleTimer = null, idleTimer = null, currentInput;
// Set theme icon
themeIcons.forEach(themeIcon => {
  if (halfmoon.readCookie("darkModeOn") == "yes") {
      themeIcon.classList.remove('fa-sun-o')
      themeIcon.classList.add('fa-moon-o')
  } else {
    themeIcon.classList.remove('fa-moon-o')
    themeIcon.classList.add('fa-sun-o')
  }
})
// Get username if stored in browser
let username = sessionStorage.getItem('username') == undefined ? null : sessionStorage.getItem('username');
// If username set, start stream
if (username == null) {
  userform.classList.remove('d-none')
  // userform.classList.add('d-block')
} else {
  userform.classList.remove('d-block')
  userform.classList.add('d-none')

  const localContainer = document.createElement('div')
  localContainer.id = "video-container"
  const localVideo = document.createElement('video')
  localVideo.muted = true
  localVideo.controls = false
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(stream => {
    localVideoStream = stream;
    // addVideoStream(localVideo, stream)
    addVideoStream(localContainer, localVideo, stream)

    peer.on('call', call => {
      call.answer(stream)
      const remoteContainer = document.createElement('div')
      remoteContainer.id = "video-container"
      const video = document.createElement('video')
      video.controls = false
      let oncall = true
      call.on('stream', remoteVideoStream => {
        // addVideoStream(video, remoteVideoStream)
        if (oncall) {
          oncall = false
          addVideoStream(remoteContainer, video, remoteVideoStream)
        }
      })
    })

    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream)
    })
  })
}

// Typing Indicator shenanigans
chatform.addEventListener('keyup', event => {
  // Can use some throttling if load too much
  currentInput = chatform["chat-text"].value
  if (typing){
    socket.emit('chat:typing', username)
    typing = false;
    if (throttleTimer) clearInterval(throttleTimer);
    throttleTimer = setTimeout(() => {
      typing = true
    }, 500)
  }
  // Detecting idle time
  if (idleTimer) clearInterval(idleTimer);
  idleTimer = setTimeout(() => {
    if (chatform["chat-text"].value === currentInput) {
      socket.emit('chat:not-typing', username)
    }
  }, 1500)
})

chatform.addEventListener('blur', event => {
  if (throttleTimer) clearInterval(throttleTimer);
  if (idleTimer) clearInterval(idleTimer);
  socket.emit('chat:not-typing', username)
})

socket.on('chat:not-typing', username => {
  feedback.innerHTML = ""
})

socket.on('chat:typing', username => {
  // feedback.innerHTML = ""
  feedback.innerHTML = `<div class="container-dot">
                            ${username} typing 
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                          </div>`
})

// messages.scrollTo({
//   behavior: "smooth",
//   top: document.body.offsetTop,
// });

// Username shenanigans
userform.addEventListener("submit", event => {
  event.preventDefault();
  username = userform["username"].value;
  if (username.toString().trim() === "") return false;
  sessionStorage.setItem('username', username)
  userform.classList.add('d-none')
  // userform.reset();

  const localContainer = document.createElement('div')
  localContainer.id = "video-container"
  const localVideo = document.createElement('video')
  localVideo.muted = true
  localVideo.controls = false
  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true
  }).then(stream => {
    localVideoStream = stream;
    // addVideoStream(localVideo, stream)
    addVideoStream(localContainer, localVideo, stream)

    peer.on('call', call => {
      call.answer(stream)
      const remoteContainer = document.createElement('div')
      remoteContainer.id = "video-container"
      const video = document.createElement('video')
      video.controls = false
      let oncall = true
      call.on('stream', remoteVideoStream => {
        // addVideoStream(video, remoteVideoStream)
        if (oncall) {
          oncall = false
          addVideoStream(remoteContainer, video, remoteVideoStream)
        }
      })
    })

    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream)
    })
  })
  location.reload()
});

// const localVideo = document.createElement('video')
// localVideo.muted = true
// localVideo.controls = true
// navigator.mediaDevices.getUserMedia({
//   video: true,
//   audio: true
// }).then(stream => {
//   localVideoStream = stream;
//   addVideoStream(localVideo, stream)
// 
//   peer.on('call', call => {
//     call.answer(stream)
//     const video = document.createElement('video')
//     call.on('stream', remoteVideoStream => {
//       addVideoStream(video, remoteVideoStream)
//     })
//   })
// 
//   socket.on('user-connected', userId => {
//     connectToNewUser(userId, stream)
//   })
// })

// Audio and Video toggle shenanigans
socket.on('audio:enabled', username => {
  toastAlert(username, "audio", true)
})
socket.on('audio:disabled', username => {
  toastAlert(username, "audio", false)
})
socket.on('video:enabled', username => {
  toastAlert(username, "video", true)
})
socket.on('video:disabled', username => {
  toastAlert(username, "video", false)
})
socket.on('video:resumed', username => {
  toastAlert(username, "resumed", true)
})
socket.on('video:paused', username => {
  toastAlert(username, "paused", false)
})
socket.on('audio:unmuted', username => {
  toastAlert(username, "unmuted", true)
})
socket.on('audio:muted', username => {
  toastAlert(username, "muted", false)
})

// User disconnect cleanup
socket.on('user-disconnected', userId => {
  if (peers[userId]) peers[userId].close()
})

peer.on('open', id => {
  socket.emit('join-room', ROOM_ID, id)
})

// Chat messages shenanigans
chatform.addEventListener("submit", event => {
  event.preventDefault();
  let message = chatform["chat-text"].value;
  if (message.toString().trim() === "") return false;
  socket.emit('chat:not-typing', username)
  socket.emit("chat", { username, message })
  chatform.reset();
});

socket.on("chat", ({ user, message }) => {
  addNewMessage(user, message);
  // applyColor(document.querySelectorAll('#received .message'));
  // applyColor(document.querySelectorAll('#sent .message'));
});

// Connecting users shenanigans
// const connectToNewUser = (userId, stream) => {
//   const call = peer.call(userId, stream)
//   const video = document.createElement('video')
//   video.controls = true
//   video.id = userId
//   call.on('stream', remoteVideoStream => {
//     addVideoStream(video, remoteVideoStream)
//   })
//   call.on('close', () => {
//     video.remove()
//   })
// 
//   peers[userId] = call
// }
const connectToNewUser = (userId, stream) => {
  const call = peer.call(userId, stream)
  const container = document.createElement('div')
  container.id = "video-container"
  const video = document.createElement('video')
  video.controls = false
  video.id = userId
  let oncall = true
  call.on('stream', remoteVideoStream => {
    if (oncall) {
      oncall = false
      addVideoStream(container, video, remoteVideoStream)
    }
  })
  call.on('close', () => {
    video.remove()
    container.remove()
  })

  peers[userId] = call
}

// Adding video stream
// const addVideoStream = (video, stream) => {
//   video.srcObject = stream;
//   video.addEventListener('loadedmetadata', () => {
//     video.play()
//   })
//   videoGrid.append(video)
// }
const addVideoStream = (container, video, stream) => {
  video.srcObject = stream;
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  container.appendChild(video)
  let { controls, playpause, muteButton, pipButton, fullScreenButton, volumeBar } = addControls(container)
  if (video.muted || video.volume === 0) {
    volumeBar.value = 0;
    muteButton.innerHTML = "<i class='fas fa-volume-mute mute'></i>";
  } else if (video.volume > 0 && video.volume <= 0.5) {
    volumeBar.value = video.volume;
    muteButton.innerHTML = "<i class='fas fa-volume-down mute'></i>";
  } else {
    volumeBar.value = video.volume;
    muteButton.innerHTML = "<i class='fas fa-volume-up mute'></i>";
  }
  controls.classList.add('controls-fade-out')
  videoGrid.append(container)

  playpause.addEventListener("click", () => {
    if (video.paused == true) {
      video.play();
      socket.emit('video:resumed', username)
      playpause.innerHTML = "<i class='fa fa-pause'></i>";
    } else {
      video.pause();
      controls.classList.remove('controls-fade-out')
      socket.emit('video:paused', username)
      playpause.innerHTML = "<i class='fa fa-play'></i>";
    }
  });

  // Event listener for the mute button
  muteButton.addEventListener("click", () => {
    if (video.muted == false) {
      video.muted = true;
      volumeBar.setAttribute('data-volume', volumeBar.value);
      volumeBar.value = 0;
      socket.emit('audio:muted', username)
      muteButton.innerHTML = "<i class='fas fa-volume-mute mute'></i>";
    } else {
      video.muted = false;
      volumeBar.value = volumeBar.dataset.volume;
      socket.emit('audio:unmuted', username)
      if (volumeBar.value > 0 && volumeBar.value <= 0.5) {
         muteButton.innerHTML = "<i class='fas fa-volume-down mute'></i>";
       } else {
         muteButton.innerHTML = "<i class='fas fa-volume-up mute'></i>";
       }
    }
  });

  // Event listener for the full-screen button
  fullScreenButton.addEventListener("click", () => {
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if (video.mozRequestFullScreen) {
      video.mozRequestFullScreen(); // Firefox
    } else if (video.webkitRequestFullscreen) {
      video.webkitRequestFullscreen(); // Chrome and Safari
    }
  });

  // Event listener for the picture-in-picture button
  pipButton.addEventListener("click", () => {
    if (video !== document.pictureInPictureElement) {
      video.requestPictureInPicture();
    } else {
      document.exitPictureInPicture();
    }
  });

  // Event listener for the volume bar
  volumeBar.addEventListener("change", () => {
    // Update the video volume
    video.volume = volumeBar.value;
  });

  video.addEventListener("volumechange", () => {
    if (video.muted || video.volume === 0) {
      muteButton.innerHTML = "<i class='fas fa-volume-mute mute'></i>";
    } else if (video.volume > 0 && video.volume <= 0.5) {
      muteButton.innerHTML = "<i class='fas fa-volume-down mute'></i>";
    } else {
      muteButton.innerHTML = "<i class='fas fa-volume-up mute'></i>";
    }
  });

  video.addEventListener('mouseout', () => { 
    controls.classList.add('controls-fade-out'); 
  });

  controls.addEventListener('mouseout', () => { 
    controls.classList.add('controls-fade-out'); 
  });

  video.addEventListener('mouseover', () => { 
    controls.classList.remove('controls-fade-out'); 
  });

  controls.addEventListener('mouseover', () => { 
    controls.classList.remove('controls-fade-out'); 
  });

  video.addEventListener('touchstart', () => {
    if (controls.classList.contains('controls-fade-out')) {
      controls.classList.remove('controls-fade-out');
    } else {
      controls.classList.add('controls-fade-out');
    }
  });

  controls.addEventListener('touchstart', () => {
    if (controls.classList.contains('controls-fade-out')) {
      controls.classList.remove('controls-fade-out');
    } else {
      controls.classList.add('controls-fade-out');
    }
  });

}

const toggleSound = () => {
  const enabled = localVideoStream.getAudioTracks()[0].enabled;
  if (enabled && muteIcon.classList.contains('fa-microphone')) {
    socket.emit('audio:disabled', username)
    localVideoStream.getAudioTracks()[0].enabled = false;
    muteIcon.classList.remove('fa-microphone')
    muteIcon.classList.add('fa-microphone-slash')
  } else {
    socket.emit('audio:enabled', username)
    muteIcon.classList.remove('fa-microphone-slash')
    muteIcon.classList.add('fa-microphone')
    localVideoStream.getAudioTracks()[0].enabled = true;
  }
}

const toggleVideo = () => {
  let enabled = localVideoStream.getVideoTracks()[0].enabled;
  if (enabled && stopIcon.classList.contains('fa-video')) {
    socket.emit('video:disabled', username)
    localVideoStream.getVideoTracks()[0].enabled = false;
    stopIcon.classList.remove('fa-video')
    stopIcon.classList.add('fa-video-slash')
  } else {
    socket.emit('video:enabled', username)
    stopIcon.classList.remove('fa-video-slash')
    stopIcon.classList.add('fa-video')
    localVideoStream.getVideoTracks()[0].enabled = true;
  }
}

const toggleTheme = () => {
  themeIcons.forEach(themeIcon => {
    if (themeIcon.classList.contains('fa-sun-o')) {
      themeIcon.classList.remove('fa-sun-o')
      themeIcon.classList.add('fa-moon-o')
    } else {
      themeIcon.classList.remove('fa-moon-o')
      themeIcon.classList.add('fa-sun-o')
    }
  })
  halfmoon.toggleDarkMode();
}

const toggleSidebar = () => {
  barIcons.forEach(barIcon => {
    if (barIcon.classList.contains('fa-arrow-left')) {
      barIcon.classList.remove('fa-arrow-left')
      barIcon.classList.add('fa-arrow-right')
    } else {
      barIcon.classList.remove('fa-arrow-right')
      barIcon.classList.add('fa-arrow-left')
    }
  })
  halfmoon.toggleSidebar();
}

const toastAlert = (username, type, enabled) => {
  let alertContent, alertType;
  if (type == "paused") {
    alertContent = "Video paused."
    alertType = "alert-secondary"
  } else if (type == "resumed") {
    alertContent = "Video resumed."
    alertType = "alert-success"
  } else if (type == "unmuted") {
    alertContent = "Audio unmuted."
    alertType = "alert-success"
  } else if (type == "muted") {
    alertContent = "Audio muted."
    alertType = "alert-secondary"
  }
  if (enabled) {
    if (type == "audio") {
      alertContent = "Audio enabled."
      alertType = "alert-success"
    } else if (type == "video") {
      alertContent = "Video enabled."
      alertType = "alert-success"
    }
  } else {
    if (type == "audio") {
      alertContent = "Audio disabled."
      alertType = "alert-danger"
    } else if (type == "video") {
      alertContent = "Video disabled."
      alertType = "alert-danger"
    }
  }
  halfmoon.initStickyAlert({
    content: alertContent,
    title: `${username}`,
    alertType: alertType,
    fillType: "filled-lm",
    hasDismissButton: true,
    timeShown: 5000
  });
}

const addNewMessage = (user, message) => {
  // user === data.user ? "You" : data.user;
  let div = document.createElement("div");
  div.classList.add("card", "p-10", "my-5", username === user ? "ml-auto" : "mr-auto");
  div.id = username === user ? "sent" : "recieved";
  div.innerHTML = `
        <span class="font-weight-bold card-title ${username === user ? "text-right" : "text-left"}">${username === user ? "You" : user}</span><br />
        <span class="text"
          >${message}</span
        >
    `;

  messages.appendChild(div);

  messages.scrollTo({
    behavior: "smooth",
    top: document.body.offsetHeight,
  });
  // messages.scrollTo({
  //   behavior: "smooth",
  //   top: document.body.offsetTop,
  // });
};

const addControls =  videoContainer => {
  let controls = document.createElement('div')
  controls.id = "video-controls"
  controls.classList.add('row', 'mx-auto')
  let playpause = document.createElement('button')
  playpause.id = "play-pause"
  playpause.classList.add('btn', 'mx-5')
  playpause.type = "button"
  playpause.innerHTML = "<i class='fa fa-pause'></i>";
  let muteButton = document.createElement('button')
  muteButton.id = "mute"
  muteButton.classList.add('btn', 'mx-5')
  muteButton.type = "button"
  muteButton.innerHTML = "<i class='fas fa-volume-up'></i>";
  let pipButton = document.createElement('button')
  pipButton.id = "pip"
  pipButton.classList.add('btn', 'mx-5')
  pipButton.type = "button"
  pipButton.innerHTML = "<i class='fa fa-window-restore'></i>";
  let fullScreenButton = document.createElement('button')
  fullScreenButton.id = "full-screen"
  fullScreenButton.classList.add('btn', 'mx-5')
  fullScreenButton.type = "button"
  fullScreenButton.innerHTML = "<i class='fa fa-arrows-alt'></i>";
  let volumeBar = document.createElement('input')
  volumeBar.type = "range"
  volumeBar.id = "volume-bar"
  volumeBar.min = "0"
  volumeBar.max = "1"
  volumeBar.step = "0.1"
  volumeBar.value = "1"

  controls.appendChild(playpause)
  controls.appendChild(muteButton)
  controls.appendChild(volumeBar)
  if (('pictureInPictureEnabled' in document)) {
    controls.appendChild(pipButton)
  }
  controls.appendChild(fullScreenButton)

  videoContainer.appendChild(controls)

  return {
    controls,
    playpause,
    muteButton,
    pipButton,
    fullScreenButton,
    volumeBar
  }
}

/** code by webdevtrick ( https://webdevtrick.com ) **/
let newcolor;
const color = () => {
  newcolor = "#" + ((Math.random() * 0xffffff) << 0).toString(16);
  if (newcolor.length < 7) {
    color();
  }
};
const colApply = () => {
  let r, g, b, cstring;
  color();
  r = newcolor.slice(1, 3);
  g = newcolor.slice(3, 5);
  b = newcolor.slice(5, 7);
  r = parseInt(r, 16);
  g = parseInt(g, 16);
  b = parseInt(b, 16);

  cstring = `rgba(${r},${g},${b}, 0.2)`;

  // $(".message-body").css({
  //   color: newcolor,
  // });
  // $(".message-body").css({
  //   background: cstring,
  // });
};