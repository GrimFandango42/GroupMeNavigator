import { useQuery } from "@tanstack/react-query";
import { GroupMeAPI } from "@/lib/groupme-api";
import type { GroupMeGroup, GroupMeMember } from "@shared/schema";

interface MembersSidebarProps {
  group?: GroupMeGroup;
  className?: string;
}

export function MembersSidebar({ group, className = "" }: MembersSidebarProps) {
  const { data: currentUser } = useQuery({
    queryKey: ['/api/me'],
  });

  const generateInitials = (name: string) => {
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getGradientClass = (name: string) => {
    const gradients = [
      'from-purple-500 to-pink-500',
      'from-green-500 to-teal-500',
      'from-orange-500 to-red-500',
      'from-blue-500 to-indigo-500',
      'from-yellow-500 to-orange-500',
      'from-pink-500 to-rose-500',
    ];
    const index = name.length % gradients.length;
    return gradients[index];
  };

  if (!group) {
    return (
      <div className={`hidden lg:flex lg:w-64 bg-white border-l border-gray-200 flex-col ${className}`}>
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Members</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-500">
          Select a group to view members
        </div>
      </div>
    );
  }

  // Separate current user from other members
  const currentUserMember = group.members.find(member => member.user_id === currentUser?.id);
  const otherMembers = group.members.filter(member => member.user_id !== currentUser?.id);

  return (
    <div className={`hidden lg:flex lg:w-64 bg-white border-l border-gray-200 flex-col ${className}`}>
      {/* Members Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Members</h3>
          <span className="text-sm text-gray-500">{group.members.length}</span>
        </div>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto">
        {/* Current User */}
        {currentUserMember && (
          <div className="p-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Using Bridge App</h4>
            <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-groupme-blue to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {currentUserMember.image_url ? (
                    <img src={currentUserMember.image_url} alt={currentUserMember.nickname} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    generateInitials(currentUserMember.nickname)
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">You</p>
                <p className="text-xs text-green-600">Using Bridge App</p>
              </div>
            </div>
          </div>
        )}

        {/* Other Members */}
        {otherMembers.length > 0 && (
          <div className="p-3 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Via GroupMe</h4>
            <div className="space-y-1">
              {otherMembers.map((member) => (
                <div key={member.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="relative">
                    <div className={`w-8 h-8 bg-gradient-to-br ${getGradientClass(member.nickname)} rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                      {member.image_url ? (
                        <img src={member.image_url} alt={member.nickname} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        generateInitials(member.nickname)
                      )}
                    </div>
                    {/* Mock online status */}
                    <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${Math.random() > 0.5 ? 'bg-green-500' : 'bg-gray-400'} border-2 border-white rounded-full`}></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{member.nickname}</p>
                    <p className="text-xs text-gray-500">
                      {member.muted ? 'Muted' : Math.random() > 0.5 ? 'Active now' : 'Active 5m ago'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Phase Transition Info */}
      <div className="p-4 border-t border-gray-200 bg-blue-50">
        <div className="text-xs text-blue-800">
          <h4 className="font-medium mb-2">Transition Plan</h4>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <span>Phase 1: API Bridge</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-2 h-2 border border-blue-600 rounded-full"></div>
              <span>Phase 2: Custom Groups</span>
            </div>
            <div className="flex items-center space-x-2 text-blue-600">
              <div className="w-2 h-2 border border-blue-600 rounded-full"></div>
              <span>Phase 3: Full Migration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
