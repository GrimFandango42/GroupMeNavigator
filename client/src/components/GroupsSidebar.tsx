import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { GroupMeAPI } from "@/lib/groupme-api";
import { Input } from "@/components/ui/input";
import { Search, Wifi, WifiOff, Info } from "lucide-react";
import type { GroupMeGroup } from "@shared/schema";

interface GroupsSidebarProps {
  selectedGroupId?: string;
  onSelectGroup: (group: GroupMeGroup) => void;
  className?: string;
}

export function GroupsSidebar({ selectedGroupId, onSelectGroup, className = "" }: GroupsSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: groups = [], isLoading, error } = useQuery<GroupMeGroup[]>({
    queryKey: ['/api/groups'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: status } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 10000, // Check status every 10 seconds
  });

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const generateInitials = (name: string) => {
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date().getTime();
    const messageTime = new Date(timestamp).getTime();
    const diffInSeconds = Math.floor((now - messageTime) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className={`hidden md:flex md:w-80 bg-white border-r border-gray-200 flex-col ${className}`}>
      {/* Header with API Status */}
      <div className="p-4 border-b border-gray-200 bg-groupme-blue text-white">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">GroupMe Bridge</h1>
          <div className="flex items-center space-x-2">
            {status?.connected ? (
              <>
                <Wifi className="w-4 h-4 text-green-400" />
                <span className="text-xs">Connected</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-400" />
                <span className="text-xs">Disconnected</span>
              </>
            )}
          </div>
        </div>
        <p className="text-xs text-blue-100 mt-1">Phase 1: GroupMe API Integration</p>
      </div>

      {/* Search Groups */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">Loading groups...</div>
        ) : error ? (
          <div className="p-4 text-center text-red-500">
            <Info className="w-6 h-6 mx-auto mb-2" />
            Failed to load groups. Check your GroupMe API token.
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No groups found matching your search.' : 'No groups available.'}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => onSelectGroup(group)}
              className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                selectedGroupId === group.id ? 'bg-blue-50 border-l-4 border-l-groupme-blue' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                {/* Group avatar */}
                <div className="w-12 h-12 bg-gradient-to-br from-groupme-blue to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
                  {group.image_url ? (
                    <img src={group.image_url} alt={group.name} className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    generateInitials(group.name)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{group.name}</h3>
                  {group.messages.preview ? (
                    <>
                      <p className="text-sm text-gray-500 truncate">
                        {group.messages.preview.nickname}: {group.messages.preview.text}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(group.messages.last_message_created_at)}
                        </span>
                        {group.messages.count > 0 && (
                          <span className="bg-groupme-blue text-white text-xs rounded-full px-2 py-1">
                            {group.messages.count > 99 ? '99+' : group.messages.count}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">No messages yet</p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer with Phase Info */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <div className="flex items-center space-x-2 mb-1">
            <Info className="w-3 h-3" />
            <span>Phase 1: API Bridge Mode</span>
          </div>
          <p>Messages sync with GroupMe in real-time</p>
        </div>
      </div>
    </div>
  );
}
