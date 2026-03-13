import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  const PORT = process.env.PORT || 3000;

  // Socket.io logic
  const rooms = new Map<string, { red?: string, black?: string }>();

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join_room', (roomId: string) => {
      let room = rooms.get(roomId);
      
      if (!room) {
        // Room doesn't exist, create it and assign user as red (host)
        room = { red: socket.id };
        rooms.set(roomId, room);
        socket.join(roomId);
        socket.emit('waiting_in_room', { roomId, color: 'red' });
      } else if (!room.black && room.red !== socket.id) {
        // Room exists and has 1 player, join as black
        room.black = socket.id;
        socket.join(roomId);
        
        // Notify both players that the match is starting
        io.to(room.red!).emit('match_found', { roomId, color: 'red' });
        socket.emit('match_found', { roomId, color: 'black' });
      } else {
        // Room is full or player already in room
        socket.emit('room_full');
      }
    });

    socket.on('make_move', (data) => {
      const { roomId, move } = data;
      socket.to(roomId).emit('opponent_moved', move);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      
      // Find and clean up rooms
      for (const [roomId, room] of rooms.entries()) {
        if (room.red === socket.id || room.black === socket.id) {
          socket.to(roomId).emit('opponent_disconnected');
          rooms.delete(roomId);
          break;
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
