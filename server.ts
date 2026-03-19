/**
 * Custom Next.js server with Socket.io integration
 */
import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { initSocketServer } from './src/lib/socket-server';
import { memoryMonitor } from './src/lib/memory-monitor';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  // Initialize Socket.io
  const io = new Server(server, {
    cors: {
      origin: dev ? 'http://localhost:3000' : process.env.NEXTAUTH_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Initialize socket handlers
  initSocketServer(io);

  // Start memory monitoring
  memoryMonitor.start();

  // Graceful shutdown on critical memory usage
  const memoryCheckInterval = setInterval(() => {
    if (memoryMonitor.isCritical()) {
      console.error('CRITICAL: Memory usage exceeded 2GB. Initiating graceful shutdown...');
      clearInterval(memoryCheckInterval);

      // Stop accepting new connections
      server.close(() => {
        console.log('Server closed. Exiting process.');
        process.exit(1);
      });

      // Force exit after 30 seconds if graceful shutdown fails
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    }
  }, 60000); // Check every minute

  // Graceful shutdown handlers
  const shutdown = () => {
    console.log('Shutting down gracefully...');
    memoryMonitor.stop();
    clearInterval(memoryCheckInterval);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  server.listen(port, (err?: Error) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running`);
    console.log(`> Memory monitoring enabled`);
  });
});
