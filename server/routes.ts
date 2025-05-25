import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import type { GroupMeGroup, GroupMeMessage, GroupMeUser } from "@shared/schema";

const GROUPME_API_URL = "https://api.groupme.com/v3";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws, req) => {
    const clientId = Math.random().toString(36).substring(7);
    clients.set(clientId, ws);
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'join_group') {
          ws.groupId = message.groupId;
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(clientId);
    });
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
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
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
      
      res.json(groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
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
      
      res.json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
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

      // Broadcast to connected clients for real-time updates
      clients.forEach((client, clientId) => {
        if (client.readyState === WebSocket.OPEN && client.groupId === groupId) {
          client.send(JSON.stringify({
            type: 'new_message',
            groupId,
            message: data.response.message
          }));
        }
      });

      res.json(data.response);
    } catch (error) {
      console.error('Error sending message:', error);
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
