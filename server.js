const throng = require("throng");

const WORKERS = process.env.WEB_CONCURRENCY || 1;
const PORT = process.env.PORT || 3000;
const botName = "VC";

const start = () => {
  const cors = require('cors');
  const express = require('express');
  const { ExpressPeerServer } = require('peer');
  const app = express();
  const server = require('http').Server(app);
  const io = require('socket.io')(server);
  const { v4: uuid } = require('uuid');
  const peerServer = ExpressPeerServer(server, { debug: true });

  app.set('view engine', 'ejs')
  app.use(express.static('public'))

  app.use('/peerjs', peerServer)

  app.use(cors())

  app.get('/', (req, res) => {
    res.redirect(`/${uuid()}`)
  })

  app.get('/:room', (req, res) => {
    res.render('room', { roomId: req.params.room })
  })

  io.on('connection', socket => {
    socket.on('join-room', (roomId, userId) => {
      socket.join(roomId)
      socket.to(roomId).broadcast.emit('user-connected', userId)
      // Welcome current user
      socket.to(roomId).emit("chat", {
        user: botName,
        message: "Welcome!",
      });
      //   Broadcast when a user connects
      //   socket.broadcast.to(user.room).emit("chat:new", {
      //     user: botName,
      //     message: `${user.name} has joined the room.`,
      //   });

  	socket.on("video:enabled", username => {
  	  socket.to(roomId).broadcast.emit('video:enabled', username)
  	})
  	socket.on("video:disabled", username => {
  		socket.to(roomId).broadcast.emit('video:disabled', username)
  	})
  	socket.on("audio:enabled", username => {
  	  socket.to(roomId).broadcast.emit('audio:enabled', username)
  	})
  	socket.on("audio:disabled", username => {
  	  socket.to(roomId).broadcast.emit('audio:disabled', username)
  	})
  	socket.on("video:resumed", username => {
  	  socket.to(roomId).broadcast.emit('video:resumed', username)
  	})
  	socket.on("video:paused", username => {
  	  socket.to(roomId).broadcast.emit('video:paused', username)
  	})
  	socket.on("audio:unmuted", username => {
  	  socket.to(roomId).broadcast.emit('audio:unmuted', username)
  	})
  	socket.on("audio:muted", username => {
  	  socket.to(roomId).broadcast.emit('audio:muted', username)
  	})
    // when the client emits 'chat', this listens and executes
      socket.on("chat", data => {
        // we tell the client to execute 'chat'
        io.in(roomId).emit("chat", {
          user: data.username,
          message: data.message,
        });
      });

      // when the client emits 'typing', we broadcast it to others
      socket.on("chat:typing", username => {
        socket.to(roomId).broadcast.emit("chat:typing", username)
      })

      // when the client emits 'not typing', we broadcast it to others
      socket.on('chat:not-typing', username => {
        socket.to(roomId).broadcast.emit("chat:not-typing", username)
      })

  	socket.on('disconnect', () => {
  	  socket.to(roomId).broadcast.emit('user-disconnected', userId)
  	 })
    })

  })

  server.listen(PORT, () => {
    console.log(`Server listening at port ${PORT}`);
  });
};
throng({ workers: WORKERS, lifetime: Infinity }, start);