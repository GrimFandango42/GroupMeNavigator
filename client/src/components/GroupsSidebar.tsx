import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import debounce from 'lodash.debounce';
import { GroupMeAPI } from "@/lib/groupme-api";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { Search, Wifi, WifiOff, Info, Loader2 } from "lucide-react"; // Import Loader2
import type { GroupMeGroup } from "@shared/schema";
import { GroupListItem } from './GroupListItem';

interface GroupsSidebarProps {
  selectedGroupId?: string;
  onSelectGroup: (group: GroupMeGroup) => void;
  className?: string;
}

export function GroupsSidebar({ selectedGroupId, onSelectGroup, className = "" }: GroupsSidebarProps) {
  const [inputValue, setInputValue] = useState(""); // For immediate input feedback
  const [searchQuery, setSearchQuery] = useState(""); // For debounced search query

  const { data: groups = [], isLoading, error } = useQuery<GroupMeGroup[]>({
    queryKey: ['/api/groups'],
    refetchInterval: 30000, // Refresh every 30 seconds
    onSuccess: (fetchedGroups) => {
      console.log('[GroupsSidebar] Fetched groups:', fetchedGroups.length, 'groups');
    },
  });

  const { data: status } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 10000, // Check status every 10 seconds
  });

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Debounce the search query update
  const debouncedSetSearchQuery = useMemo(
    () => debounce(setSearchQuery, 300),
    [setSearchQuery] // searchQuery is not needed here, only the setter
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSetSearchQuery.cancel();
    };
  }, [debouncedSetSearchQuery]);

  const generateInitials = useCallback((name: string) => {
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const formatTimeAgo = useCallback((timestamp: string) => {
    const now = new Date().getTime();
    // Convert Unix timestamp (seconds) to milliseconds
    const messageTime = new Date(Number(timestamp) * 1000).getTime();
    const diffInSeconds = Math.floor((now - messageTime) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }, []);

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
            value={inputValue}
            onChange={(e) => {
              const newValue = e.target.value;
              setInputValue(newValue);
              debouncedSetSearchQuery(newValue);
            }}
            className="pl-10"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Groups List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="h-8 w-8 animate-spin mb-2" />
            <span>Loading groups...</span>
          </div>
        ) : error ? (
          <div className="p-4">
            <Alert variant="destructive">
              <Info className="h-4 w-4" /> {/* Standard icon size for Alert */}
              <AlertTitle>Error Loading Groups</AlertTitle>
              <AlertDescription>
                Failed to load groups. Check your GroupMe API token or network connection.
              </AlertDescription>
            </Alert>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? 'No groups found matching your search.' : 'No groups available.'}
          </div>
        ) : (
          filteredGroups.map((group) => (
            <GroupListItem
              key={group.id}
              group={group}
              isSelected={selectedGroupId === group.id}
              onSelectGroup={onSelectGroup} // onSelectGroup is passed from parent, assumed stable or memoized there
              generateInitials={generateInitials}
              formatTimeAgo={formatTimeAgo}
            />
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
