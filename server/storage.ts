import { users, type User, type InsertUser, type GroupMeGroup, type GroupMeMessage, type GroupMeUser } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // GroupMe API data cache (in-memory for Phase 1)
  cacheGroups(userId: string, groups: GroupMeGroup[]): Promise<void>;
  getCachedGroups(userId: string): Promise<GroupMeGroup[]>;
  cacheMessages(groupId: string, messages: GroupMeMessage[]): Promise<void>;
  getCachedMessages(groupId: string): Promise<GroupMeMessage[]>;
  cacheUser(user: GroupMeUser): Promise<void>;
  getCachedUser(userId: string): Promise<GroupMeUser | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private groupsCache: Map<string, GroupMeGroup[]>;
  private messagesCache: Map<string, GroupMeMessage[]>;
  private usersCache: Map<string, GroupMeUser>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.groupsCache = new Map();
    this.messagesCache = new Map();
    this.usersCache = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async cacheGroups(userId: string, groups: GroupMeGroup[]): Promise<void> {
    this.groupsCache.set(userId, groups);
  }

  async getCachedGroups(userId: string): Promise<GroupMeGroup[]> {
    return this.groupsCache.get(userId) || [];
  }

  async cacheMessages(groupId: string, messages: GroupMeMessage[]): Promise<void> {
    this.messagesCache.set(groupId, messages);
  }

  async getCachedMessages(groupId: string): Promise<GroupMeMessage[]> {
    return this.messagesCache.get(groupId) || [];
  }

  async cacheUser(user: GroupMeUser): Promise<void> {
    this.usersCache.set(user.id, user);
  }

  async getCachedUser(userId: string): Promise<GroupMeUser | undefined> {
    return this.usersCache.get(userId);
  }
}

export const storage = new MemStorage();
