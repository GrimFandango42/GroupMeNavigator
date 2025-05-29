import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, authenticateUser, validatePassword } from "./storage";
import type { 
  GroupMeGroup, GroupMeMessage, GroupMeUser,
  CustomGroupWithMembers, CustomMessageWithDetails, WebSocketMessage
} from "@shared/schema";
import { 
  insertUserSchema, createCustomGroupSchema, sendMessageSchema, joinGroupSchema
} from "@shared/schema";

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
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${GROUPME_API_URL}${endpoint}${separator}token=${token}`;
    
    console.log(`[Server] Making GroupMe API request to: ${url.replace(token, 'TOKEN_HIDDEN')}`);

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
    } catch (error) {
      console.error('[Server] Error fetching groups /api/groups:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get messages for a specific group
  app.get("/api/groups/:groupId/messages", async (req, res) => {
    try {
      const { groupId } = req.params;
      const { before_id, limit = "20" } = req.query;
      
      console.log(`[Server] Fetching messages for group ${groupId}, before_id: ${before_id || 'none'}, limit: ${limit}`);
      
      let apiEndpoint = `/groups/${groupId}/messages?limit=${limit}`;
      if (before_id) {
        apiEndpoint += `&before_id=${before_id}`;
      }
      
      // Use the groupMeRequest helper
      const data = await groupMeRequest(apiEndpoint);
      
      // Validate response format (groupMeRequest returns parsed JSON)
      // The GroupMe API for messages returns { response: { count: N, messages: [...] } }
      if (!data || !data.response || !Array.isArray(data.response.messages)) {
        console.error(`[Server] Invalid response format from GroupMe API for group ${groupId}:`, JSON.stringify(data).slice(0, 200) + '...');
        return res.status(500).json({ message: 'Invalid response format from GroupMe API' });
      }
      
      const messages = data.response.messages as GroupMeMessage[];
      
      // Cache messages
      await storage.cacheMessages(groupId, messages);
      
      console.log(`[Server] /api/groups/${groupId}/messages - Responding with ${messages.length} messages.`);
      
      // Return messages as a plain array to match client expectations
      res.json(messages);
    } catch (error) {
      // Use req.params.groupId to safely reference groupId in catch block
      console.error(`[Server] Error fetching messages /api/groups/${req.params.groupId}/messages:`, error);
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
      // Use req.params.groupId to safely reference groupId in catch block
      console.error(`[Server] Error sending message /api/groups/${req.params.groupId}/messages:`, error);
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

  // === PHASE 2: Authentication Routes ===
  
  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }
      
      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already registered' });
      }
      
      const user = await storage.createUser(userData);
      const token = await storage.createSession(
        user.id, 
        req.headers['user-agent'], 
        req.ip
      );
      
      res.status(201).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
    } catch (error) {
      console.error('[Server] Registration error:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Registration failed' 
      });
    }
  });

  // Login user
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password required' });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const validPassword = await validatePassword(password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      
      const token = await storage.createSession(
        user.id, 
        req.headers['user-agent'], 
        req.ip
      );
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
    } catch (error) {
      console.error('[Server] Login error:', error);
      res.status(500).json({ message: 'Login failed' });
    }
  });

  // Logout user
  app.post("/api/auth/logout", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const token = req.headers.authorization?.substring(7);
      if (token) {
        await storage.invalidateSession(token);
      }
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('[Server] Logout error:', error);
      res.status(500).json({ message: 'Logout failed' });
    }
  });

  // Get current user info (Phase 2)
  app.get("/api/auth/me", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      });
    } catch (error) {
      console.error('[Server] Get user error:', error);
      res.status(500).json({ message: 'Failed to get user info' });
    }
  });

  // === PHASE 2: Custom Groups Routes ===
  
  // Get all groups (both GroupMe and custom groups)
  app.get("/api/v2/groups", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      // Get custom groups
      const customGroups = await storage.getCustomGroupsByUser(user.id);
      
      // Get GroupMe groups (if user has linked account)
      let groupmeGroups: GroupMeGroup[] = [];
      if (user.groupmeUserId) {
        try {
          const data = await groupMeRequest("/groups");
          groupmeGroups = data.response as GroupMeGroup[];
          await storage.cacheGroups(user.groupmeUserId, groupmeGroups);
        } catch (error) {
          console.warn('[Server] Failed to fetch GroupMe groups:', error);
        }
      }
      
      res.json({
        customGroups,
        groupmeGroups,
        totalGroups: customGroups.length + groupmeGroups.length,
      });
    } catch (error) {
      console.error('[Server] Error fetching groups:', error);
      res.status(500).json({ message: 'Failed to fetch groups' });
    }
  });

  // Create custom group
  app.post("/api/v2/groups", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const groupData = createCustomGroupSchema.parse(req.body);
      const group = await storage.createCustomGroup({
        name: groupData.name,
        description: groupData.description || undefined,
        imageUrl: groupData.imageUrl || undefined,
        isPublic: groupData.isPublic,
        maxMembers: groupData.maxMembers || undefined,
        creatorId: user.id,
      });
      
      // Broadcast to connected clients
      const groupWithMembers = await storage.getCustomGroup(group.id);
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'group_created',
            group: groupWithMembers,
          }));
        }
      });
      
      res.status(201).json(groupWithMembers);
    } catch (error) {
      console.error('[Server] Error creating group:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to create group' 
      });
    }
  });

  // Get specific custom group
  app.get("/api/v2/groups/:groupId", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { groupId } = req.params;
      const group = await storage.getCustomGroup(groupId);
      
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      // Check if user is member
      const isMember = group.members.some(member => member.userId === user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }
      
      res.json(group);
    } catch (error) {
      console.error('[Server] Error fetching group:', error);
      res.status(500).json({ message: 'Failed to fetch group' });
    }
  });

  // Join custom group
  app.post("/api/v2/groups/:groupId/join", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { groupId } = req.params;
      const { nickname } = joinGroupSchema.parse(req.body);
      
      const group = await storage.getCustomGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      const membership = await storage.joinGroup(groupId, user.id, nickname);
      if (!membership) {
        return res.status(400).json({ message: 'Failed to join group' });
      }
      
      // Broadcast to group members
      const memberWithUser = { ...membership, user };
      clients.forEach((client) => {
        const wsClient = client as WebSocket & { groupId?: string };
        if (wsClient.readyState === WebSocket.OPEN && wsClient.groupId === groupId) {
          wsClient.send(JSON.stringify({
            type: 'member_joined',
            groupId,
            member: memberWithUser,
          }));
        }
      });
      
      res.json(memberWithUser);
    } catch (error) {
      console.error('[Server] Error joining group:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to join group' 
      });
    }
  });

  // Leave custom group
  app.post("/api/v2/groups/:groupId/leave", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { groupId } = req.params;
      const success = await storage.leaveGroup(groupId, user.id);
      
      if (!success) {
        return res.status(400).json({ message: 'Failed to leave group' });
      }
      
      // Broadcast to group members
      clients.forEach((client) => {
        const wsClient = client as WebSocket & { groupId?: string };
        if (wsClient.readyState === WebSocket.OPEN && wsClient.groupId === groupId) {
          wsClient.send(JSON.stringify({
            type: 'member_left',
            groupId,
            userId: user.id,
          }));
        }
      });
      
      res.json({ message: 'Left group successfully' });
    } catch (error) {
      console.error('[Server] Error leaving group:', error);
      res.status(500).json({ message: 'Failed to leave group' });
    }
  });

  // === PHASE 2: Custom Messages Routes ===
  
  // Get messages for custom group
  app.get("/api/v2/groups/:groupId/messages", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { groupId } = req.params;
      const { limit = "50", before } = req.query;
      
      // Check if user is member
      const group = await storage.getCustomGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      const isMember = group.members.some(member => member.userId === user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }
      
      const beforeDate = before ? new Date(before as string) : undefined;
      const messages = await storage.getMessages(groupId, parseInt(limit as string), beforeDate);
      
      res.json(messages);
    } catch (error) {
      console.error('[Server] Error fetching messages:', error);
      res.status(500).json({ message: 'Failed to fetch messages' });
    }
  });

  // Send message to custom group
  app.post("/api/v2/groups/:groupId/messages", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { groupId } = req.params;
      const { content, messageType = 'text', replyToId } = req.body;
      
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: 'Content is required' });
      }
      
      // Check if user is member
      const group = await storage.getCustomGroup(groupId);
      if (!group) {
        return res.status(404).json({ message: 'Group not found' });
      }
      
      const isMember = group.members.some(member => member.userId === user.id);
      if (!isMember) {
        return res.status(403).json({ message: 'Not a member of this group' });
      }
      
      const message = await storage.sendMessage(
        groupId,
        user.id,
        content,
        messageType,
        replyToId
      );
      
      // Broadcast to group members via WebSocket
      clients.forEach((client) => {
        const wsClient = client as WebSocket & { groupId?: string };
        if (wsClient.readyState === WebSocket.OPEN && wsClient.groupId === groupId) {
          wsClient.send(JSON.stringify({
            type: 'new_message',
            groupId,
            message,
          }));
        }
      });
      
      res.status(201).json(message);
    } catch (error) {
      console.error('[Server] Error sending message:', error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : 'Failed to send message' 
      });
    }
  });

  // Add reaction to message
  app.post("/api/v2/messages/:messageId/reactions", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { messageId } = req.params;
      const { reaction } = req.body;
      
      if (!reaction) {
        return res.status(400).json({ message: 'Reaction is required' });
      }
      
      await storage.addReaction(messageId, user.id, reaction);
      
      // Broadcast reaction to group members
      // Note: We'd need to get the groupId from the message to broadcast properly
      res.json({ message: 'Reaction added successfully' });
    } catch (error) {
      console.error('[Server] Error adding reaction:', error);
      res.status(500).json({ message: 'Failed to add reaction' });
    }
  });

  // === PHASE 2: Migration Routes ===
  
  // Start migration from GroupMe group to custom group
  app.post("/api/v2/migrate/:groupmeGroupId", async (req, res) => {
    try {
      const user = await authenticateUser(req.headers.authorization);
      if (!user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }
      
      const { groupmeGroupId } = req.params;
      const { groupName, groupDescription } = req.body;
      
      // Check if migration already exists
      const existingMigration = await storage.getMigration(groupmeGroupId);
      if (existingMigration) {
        return res.status(400).json({ message: 'Migration already in progress or completed' });
      }
      
      // Create custom group
      const customGroup = await storage.createCustomGroup({
        name: groupName || `Migrated Group ${groupmeGroupId}`,
        description: groupDescription,
        creatorId: user.id,
      });
      
      // Create migration record
      await storage.createMigration(groupmeGroupId, customGroup.id, user.id);
      
      res.json({
        message: 'Migration started',
        customGroup,
        migrationStatus: 'pending',
      });
    } catch (error) {
      console.error('[Server] Error starting migration:', error);
      res.status(500).json({ message: 'Failed to start migration' });
    }
  });

  return httpServer;
}
