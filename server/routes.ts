import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { GroupMeGroup, GroupMeMessage, GroupMeUser } from "@shared/schema";

const GROUPME_API_URL = "https://api.groupme.com/v3";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // General request logging middleware
  app.use((req, res, next) => {
    console.log(`[Server] HTTP Request: ${req.method} ${req.originalUrl}`);
    next();
  });

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substring(7); // Simple ID for this connection
    clients.set(clientId, ws);
    console.log(`[WebSocketServer] Client connected. clientId: ${clientId}, Total clients: ${clients.size}`);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'join_group' && message.groupId) {
          // Attach groupId to the WebSocket session for this client
          (ws as any).groupId = message.groupId; 
          console.log(`[WebSocketServer] Client (clientId: ${clientId}) subscribed to groupId: ${message.groupId}`);
        } else {
          console.log(`[WebSocketServer] Received message from client ${clientId}:`, message);
        }
      } catch (error) {
        console.error(`[WebSocketServer] Failed to parse message from client ${clientId}:`, data.toString(), error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
      console.log(`[WebSocketServer] Client disconnected. clientId: ${clientId}, Total clients: ${clients.size}`);
    });

    ws.on('error', (error) => {
      console.error(`[WebSocketServer] Error for client clientId ${clientId}:`, error);
    });
  });

  // Global error handler for the WebSocket server itself
  wss.on('error', (error) => {
    console.error('WebSocket Server error:', error);
  });

  // Helper function to get GroupMe API token
  function getGroupMeToken(): string {
    const token = process.env.GROUPME_API_TOKEN || process.env.GROUPME_TOKEN;
    if (!token) {
      throw new Error('GroupMe API token not found in environment variables');
    }
    return token;
  }

  // Helper function to make GroupMe API requests
  async function groupMeRequest(endpoint: string, options: RequestInit = {}) {
    const token = getGroupMeToken();
    const url = `${GROUPME_API_URL}${endpoint}?token=${token}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`GroupMe API error: ${response.status} ${error}`);
    }

    return response.json();
  }

  // Get current user info
  app.get("/api/me", async (req, res) => {
    try {
      const data = await groupMeRequest("/users/me");
      const user = data.response as GroupMeUser;
      await storage.cacheUser(user);
      console.log('[Server] /api/me - Responding with user:', user.id);
      res.json(user);
    } catch (error) {
      console.error('[Server] Error fetching user /api/me:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get all groups for the authenticated user
  app.get("/api/groups", async (req, res) => {
    try {
      const data = await groupMeRequest("/groups");
      const groups = data.response as GroupMeGroup[];
      
      // Cache groups (using 'me' as userId for now since we don't have user sessions)
      await storage.cacheGroups('me', groups);
      
      console.log('[Server] /api/groups - Responding with', groups.length, 'groups.');
      res.json(groups);
    } catch (error)
      console.error('[Server] Error fetching groups /api/groups:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get messages for a specific group
  app.get("/api/groups/:groupId/messages", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { before_id, limit = "20" } = req.query;
      
      let endpoint = `/groups/${groupId}/messages?limit=${limit}`;
      if (before_id) {
        endpoint += `&before_id=${before_id}`;
      }
      
      const data = await groupMeRequest(endpoint);
      const messages = data.response.messages as GroupMeMessage[];
      
      // Cache messages
      await storage.cacheMessages(groupId, messages);
      
      console.log(`[Server] /api/groups/${groupId}/messages - Responding with ${messages.length} messages.`);
      res.json(messages);
    } catch (error) {
      console.error(`[Server] Error fetching messages /api/groups/${groupId}/messages:`, error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Send a message to a group
  app.post("/api/groups/:groupId/messages", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { text, source_guid } = req.body;
      
      if (!text || !source_guid) {
        return res.status(400).json({ message: 'Text and source_guid are required' });
      }

      const messageData = {
        message: {
          source_guid,
          text,
        }
      };

      const data = await groupMeRequest(`/groups/${groupId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData),
      });
      
      console.log(`[Server] Message sent to GroupMe for group ${groupId}. Message ID: ${data.response.message.id}`);

      // Broadcast to connected clients for real-time updates
      clients.forEach((client, mapKeyClientId) => { // mapKeyClientId is the key from the clients Map
        // Ensure 'client' is a WebSocket instance and has 'groupId' property
        const wsClient = client as WebSocket & { groupId?: string }; // Type assertion
        if (wsClient.readyState === WebSocket.OPEN && wsClient.groupId === groupId) {
          try {
            // Using mapKeyClientId for logging as it's guaranteed to be unique for the map.
            console.log(`[WebSocketServer] Broadcasting new_message to client subscribed to group ${groupId}. ClientID for log: ${mapKeyClientId}`);
            wsClient.send(JSON.stringify({
              type: 'new_message',
              groupId,
              message: data.response.message
            }));
          } catch (sendError) {
            console.error(`[WebSocketServer] Failed to send message to client ${mapKeyClientId}:`, sendError);
            // Optionally, handle client disconnection
            // clients.delete(mapKeyClientId);
            // wsClient.terminate();
          }
        }
      });

      res.json(data.response);
    } catch (error) {
      console.error(`[Server] Error sending message /api/groups/${groupId}/messages:`, error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get group details
  app.get("/api/groups/:groupId", async (req, res) => {
    try {
      const { groupId } = req.params;
      const data = await groupMeRequest(`/groups/${groupId}`);
      res.json(data.response);
    } catch (error) {
      console.error('Error fetching group details:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Check API connection status
  app.get("/api/status", async (req, res) => {
    try {
      await groupMeRequest("/users/me");
      res.json({ connected: true, message: 'GroupMe API connection successful' });
    } catch (error) {
      res.status(500).json({ 
        connected: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  return httpServer;
}
