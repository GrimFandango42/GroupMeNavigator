import { useState } from "react";
import { GroupsSidebar } from "@/components/GroupsSidebar";
import { ChatArea } from "@/components/ChatArea";
import { MembersSidebar } from "@/components/MembersSidebar";
import type { GroupMeGroup } from "@shared/schema";

export default function Chat() {
  const [selectedGroup, setSelectedGroup] = useState<GroupMeGroup | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSelectGroup = (group: GroupMeGroup) => {
    setSelectedGroup(group);
    setSidebarOpen(false); // Close mobile sidebar when group is selected
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Groups Sidebar */}
      <GroupsSidebar
        selectedGroupId={selectedGroup?.id}
        onSelectGroup={handleSelectGroup}
        className={`${
          sidebarOpen 
            ? 'fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0' 
            : 'hidden md:flex'
        } transform transition-transform duration-300 ease-in-out`}
      />

      {/* Chat Area */}
      <ChatArea 
        group={selectedGroup} 
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Members Sidebar */}
      <MembersSidebar group={selectedGroup} />

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <button 
            className="flex flex-col items-center space-y-1 p-2"
            onClick={handleToggleSidebar}
          >
            <div className="w-6 h-6 bg-groupme-blue rounded flex items-center justify-center">
              💬
            </div>
            <span className="text-xs text-groupme-blue">Groups</span>
          </button>
          <button className="flex flex-col items-center space-y-1 p-2">
            <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center">
              👥
            </div>
            <span className="text-xs text-gray-600">Members</span>
          </button>
          <button className="flex flex-col items-center space-y-1 p-2">
            <div className="w-6 h-6 bg-gray-400 rounded flex items-center justify-center">
              ⚙️
            </div>
            <span className="text-xs text-gray-600">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
