import { Server } from 'socket.io';
import { verifyToken } from '../../lib/auth';

export default function SocketHandler(req, res) {
  // If the server is already running, don't start it again
  if (res.socket.server.io) {
    res.end();
    return;
  }

  console.log('Starting Socket.io Server...');
  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  // Authenticate every connection with the login JWT
  io.use((socket, next) => {
    const payload = verifyToken(socket.handshake.auth?.token);
    if (!payload?.username) {
      return next(new Error('Unauthorized'));
    }
    socket.data.username = payload.username;
    next();
  });

  io.on('connection', (socket) => {
    const username = socket.data.username;
    socket.join(username); // Each user gets their own room
    console.log(`Server: ${username} connected (ID: ${socket.id})`);

    socket.on('send_message', (data) => {
      const { receiver, content, timestamp } = data ?? {};
      if (typeof receiver !== 'string' || !receiver || !content) return;

      // Sender identity comes from the verified token, never from the client
      io.to(receiver).emit('receive_message', {
        sender: username,
        content,
        timestamp,
        isEncrypted: true,
      });
    });
  });

  res.end();
}
