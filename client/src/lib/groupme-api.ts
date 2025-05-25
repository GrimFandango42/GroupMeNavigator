import { apiRequest } from "./queryClient";
import type { GroupMeGroup, GroupMeMessage, GroupMeUser } from "@shared/schema";

export class GroupMeAPI {
  static async getCurrentUser(): Promise<GroupMeUser> {
    const response = await apiRequest('GET', '/api/me');
    return response.json();
  }

  static async getGroups(): Promise<GroupMeGroup[]> {
    const response = await apiRequest('GET', '/api/groups');
    return response.json();
  }

  static async getMessages(groupId: string, beforeId?: string, limit: number = 20): Promise<GroupMeMessage[]> {
    let url = `/api/groups/${groupId}/messages?limit=${limit}`;
    if (beforeId) {
      url += `&before_id=${beforeId}`;
    }
    const response = await apiRequest('GET', url);
    return response.json();
  }

  static async sendMessage(groupId: string, text: string): Promise<any> {
    const sourceGuid = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const response = await apiRequest('POST', `/api/groups/${groupId}/messages`, {
      text,
      source_guid: sourceGuid,
    });
    return response.json();
  }

  static async getGroup(groupId: string): Promise<GroupMeGroup> {
    const response = await apiRequest('GET', `/api/groups/${groupId}`);
    return response.json();
  }

  static async checkStatus(): Promise<{ connected: boolean; message: string }> {
    try {
      const response = await apiRequest('GET', '/api/status');
      return response.json();
    } catch {
      return { connected: false, message: 'Failed to connect to GroupMe API' };
    }
  }
}
