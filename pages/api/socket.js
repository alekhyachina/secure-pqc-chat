import { Server } from 'socket.io';

export default function SocketHandler(req, res) {
  // If server is already running, don't start it again
  if (res.socket.server.io) {
    res.end();
    return;
  }

  console.log('Starting Socket.io Server...');
  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    // 1. GET USERNAME FROM CONNECTION
    const username = socket.handshake.query.username;
    
    if (username) {
        socket.join(username); // Put user in their own room
        console.log(`✅ Server: ${username} connected (ID: ${socket.id})`);
    }

    // 2. LISTEN FOR MESSAGES
    socket.on('send_message', (data) => {
      const { receiver, sender, content, timestamp } = data;
      console.log(`📨 Server: Routing message from ${sender} to ${receiver}`);
      
      // Send only to the receiver's room
      io.to(receiver).emit('receive_message', {
        sender,
        content,
        timestamp,
        isEncrypted: true
      });
    });
  });

  res.end();
}