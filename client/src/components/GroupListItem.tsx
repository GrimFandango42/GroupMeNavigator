import React from 'react';
import type { GroupMeGroup } from "@shared/schema";

interface GroupListItemProps {
  group: GroupMeGroup;
  isSelected: boolean;
  onSelectGroup: (group: GroupMeGroup) => void;
  generateInitials: (name: string) => string;
  formatTimeAgo: (timestamp: string) => string;
}

const GroupListItemComponent: React.FC<GroupListItemProps> = ({
  group,
  isSelected,
  onSelectGroup,
  generateInitials,
  formatTimeAgo,
}) => {
  return (
    <div
      onClick={() => onSelectGroup(group)}
      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-groupme-blue' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        {/* Group avatar */}
        <div className="w-12 h-12 bg-gradient-to-br from-groupme-blue to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0">
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
  );
};

export const GroupListItem = React.memo(GroupListItemComponent);
