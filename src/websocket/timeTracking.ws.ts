import { WebSocket, WebSocketServer, RawData } from 'ws';
import { Server } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from '../config/logger';
import TimeTrackingSession from '../models/TimeTrackingSession.model';
import Employee from '../models/Employee.model';
import User from '../models/User.model';
import Role from '../models/Role.model';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  userName?: string;
  sessionId?: string;
  isAlive?: boolean;
}

interface WebSocketMessage {
  type: string;
  sessionId?: string;
  timestamp?: string;
  activeSeconds?: number;
  activityPercent?: number;
  isIdle?: boolean;
  mouseMovements?: number;
  deviceInfo?: {
    platform?: string;
    version?: string;
  };
}

class TimeTrackingWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, AuthenticatedWebSocket> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/time-tracking'
    });

    this.setupConnectionHandler();
    this.setupHeartbeat();

    logger.info('WebSocket server initialized for time tracking');
  }

  private setupConnectionHandler() {
    this.wss.on('connection', async (ws: AuthenticatedWebSocket, req) => {
      try {
        // Extract token from query string
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
          ws.close(4001, 'Authentication required');
          return;
        }

        // Verify token and get user info
        const userData = await this.authenticateToken(token);
        if (!userData) {
          ws.close(4001, 'Invalid token');
          return;
        }

        ws.userId = userData.userId;
        ws.userName = userData.userName;
        ws.isAlive = true;

        // Store client connection
        this.clients.set(userData.userId, ws);

        logger.info(`WebSocket client connected: ${userData.userName} (${userData.userId})`);

        // Setup message handler
        ws.on('message', (data) => this.handleMessage(ws, data));

        // Setup close handler
        ws.on('close', () => this.handleClose(ws));

        // Setup pong handler for heartbeat
        ws.on('pong', () => {
          ws.isAlive = true;
        });

        // Send welcome message
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'Connected to time tracking server',
          userId: userData.userId
        }));

      } catch (error) {
        logger.error('WebSocket connection error', { error });
        ws.close(4000, 'Connection error');
      }
    });
  }

  private async authenticateToken(token: string): Promise<{ userId: string; userName: string } | null> {
    try {
      logger.info('Attempting to authenticate WebSocket token', { tokenLength: token.length });
      
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
      logger.info('Token decoded successfully', { decodedId: decoded.id });
      
      const employee = await Employee.findById(decoded.id);
      if (!employee) {
        logger.error('Employee not found for decoded ID', { decodedId: decoded.id });
        return null;
      }

      logger.info('WebSocket authentication successful', { userId: employee._id, userName: employee.name });
      return {
        userId: employee._id.toString(),
        userName: employee.name
      };
    } catch (error) {
      logger.error('Token verification failed', { error, message: (error as Error).message });
      return null;
    }
  }

  private async handleMessage(ws: AuthenticatedWebSocket, data: RawData) {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());

      switch (message.type) {
        case 'start_session':
          await this.handleStartSession(ws, message);
          break;

        case 'heartbeat':
          await this.handleHeartbeat(ws, message);
          break;

        case 'end_session':
          await this.handleEndSession(ws, message);
          break;

        case 'ping':
          ws.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          ws.send(JSON.stringify({
            type: 'error',
            message: `Unknown message type: ${message.type}`
          }));
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  }

  private async handleStartSession(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    try {
      // Check for existing active session
      const existingSession = await TimeTrackingSession.findOne({
        internId: ws.userId,
        status: 'active'
      });

      if (existingSession) {
        // Resume existing session
        ws.sessionId = existingSession._id.toString();
        ws.send(JSON.stringify({
          type: 'session_started',
          sessionId: existingSession._id,
          resumed: true,
          totalActiveSeconds: existingSession.totalActiveSeconds,
          averageActivity: existingSession.averageActivity
        }));
        return;
      }

      // Create new session
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const session = await TimeTrackingSession.create({
        internId: ws.userId,
        date: today,
        sessionStart: now,
        status: 'active',
        heartbeats: [],
        appVersion: message.deviceInfo?.version || '1.0.0',
        deviceInfo: message.deviceInfo
      });

      ws.sessionId = session._id.toString();

      logger.info(`Time tracking session started via WebSocket`, {
        userId: ws.userId,
        sessionId: session._id
      });

      ws.send(JSON.stringify({
        type: 'session_started',
        sessionId: session._id,
        sessionStart: session.sessionStart
      }));

    } catch (error) {
      logger.error('Error starting session via WebSocket', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to start session'
      }));
    }
  }

  private async handleHeartbeat(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    try {
      if (!ws.sessionId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'No active session'
        }));
        return;
      }

      const session = await TimeTrackingSession.findById(ws.sessionId);
      if (!session || session.status !== 'active') {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Session not found or inactive'
        }));
        return;
      }

      // Add heartbeat data
      session.heartbeats.push({
        timestamp: new Date(),
        activityPercent: message.activityPercent || 0,
        mouseMovements: message.mouseMovements || 0,
        isIdle: message.isIdle || false,
        activeSeconds: message.activeSeconds || 0
      });

      // Update active time (only if not idle)
      if (!message.isIdle) {
        session.totalActiveSeconds += message.activeSeconds || 0;
      }

      // Calculate average activity
      const recentHeartbeats = session.heartbeats.slice(-20);
      if (recentHeartbeats.length > 0) {
        session.averageActivity = Math.round(
          recentHeartbeats.reduce((sum, hb) => sum + hb.activityPercent, 0) / recentHeartbeats.length
        );
      }

      await session.save();

      ws.send(JSON.stringify({
        type: 'heartbeat_ack',
        totalActiveSeconds: session.totalActiveSeconds,
        averageActivity: session.averageActivity
      }));

    } catch (error) {
      logger.error('Error processing heartbeat via WebSocket', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process heartbeat'
      }));
    }
  }

  private async handleEndSession(ws: AuthenticatedWebSocket, message: WebSocketMessage) {
    try {
      if (!ws.sessionId) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'No active session'
        }));
        return;
      }

      const session = await TimeTrackingSession.findById(ws.sessionId);
      if (!session) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Session not found'
        }));
        return;
      }

      session.sessionEnd = new Date();
      session.status = 'completed';
      await session.save();

      logger.info(`Time tracking session ended via WebSocket`, {
        userId: ws.userId,
        sessionId: session._id,
        totalActiveSeconds: session.totalActiveSeconds
      });

      ws.send(JSON.stringify({
        type: 'session_ended',
        sessionId: session._id,
        totalActiveSeconds: session.totalActiveSeconds,
        averageActivity: session.averageActivity
      }));

      ws.sessionId = undefined;

    } catch (error) {
      logger.error('Error ending session via WebSocket', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to end session'
      }));
    }
  }

  private handleClose(ws: AuthenticatedWebSocket) {
    if (ws.userId) {
      this.clients.delete(ws.userId);
      logger.info(`WebSocket client disconnected: ${ws.userName} (${ws.userId})`);

      // End session if still active
      if (ws.sessionId) {
        TimeTrackingSession.findByIdAndUpdate(ws.sessionId, {
          status: 'completed',
          sessionEnd: new Date()
        }).catch(err => {
          logger.error('Error auto-ending session on disconnect', { error: err });
        });
      }
    }
  }

  private setupHeartbeat() {
    // Ping clients every 30 seconds to check if they're still alive
    setInterval(() => {
      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (ws.isAlive === false) {
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  // Send message to specific user
  public sendToUser(userId: string, message: object) {
    const client = this.clients.get(userId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  // Broadcast message to all connected clients
  public broadcast(message: object) {
    const messageStr = JSON.stringify(message);
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }
}

export default TimeTrackingWebSocketServer;
