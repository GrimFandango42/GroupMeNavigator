import { useState, useEffect } from "react";
import { GroupsSidebar } from "@/components/GroupsSidebar";
import { ChatArea } from "@/components/ChatArea";
import { MembersSidebar } from "@/components/MembersSidebar";
import type { GroupMeGroup } from "@shared/schema";

export default function Chat() {
  const [selectedGroup, setSelectedGroup] = useState<GroupMeGroup | undefined>();
  const [groupsSidebarOpen, setGroupsSidebarOpen] = useState(false);
  const [membersSidebarOpen, setMembersSidebarOpen] = useState(false);

  const handleSelectGroup = (group: GroupMeGroup) => {
    setSelectedGroup(group);
    setGroupsSidebarOpen(false); // Close mobile sidebar when group is selected
    setMembersSidebarOpen(false); // Also ensure members sidebar is closed
  };

  const handleToggleGroupsSidebar = () => {
    setGroupsSidebarOpen(!groupsSidebarOpen);
    if (!groupsSidebarOpen) setMembersSidebarOpen(false); // Close members if opening groups
  };

  const handleToggleMembersSidebar = () => {
    setMembersSidebarOpen(!membersSidebarOpen);
    if (!membersSidebarOpen) setGroupsSidebarOpen(false); // Close groups if opening members
  };

  // Effect to handle body scroll prevention when a sidebar is open on mobile
  useEffect(() => {
    if (groupsSidebarOpen || membersSidebarOpen) {
      document.body.classList.add('overflow-hidden', 'md:overflow-auto');
    } else {
      document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
    }
    // Cleanup on component unmount
    return () => {
      document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
    };
  }, [groupsSidebarOpen, membersSidebarOpen]);

  return (
    <div className="flex h-screen bg-gray-50 md:overflow-hidden"> {/* Prevent scroll on desktop body, manage internally */}
      {/* Mobile overlay for both sidebars, shown if either is open */}
      {(groupsSidebarOpen || membersSidebarOpen) && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden" // z-30, lower than sidebars (z-40)
          onClick={() => {
            setGroupsSidebarOpen(false);
            setMembersSidebarOpen(false);
          }}
        />
      )}

      {/* Groups Sidebar */}
      <GroupsSidebar
        selectedGroupId={selectedGroup?.id}
        onSelectGroup={handleSelectGroup}
        className={`fixed inset-y-0 left-0 z-40 w-80 bg-white md:relative md:w-80 md:translate-x-0 transform transition-transform duration-300 ease-in-out border-r md:border-r-0 border-gray-200
          ${groupsSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:flex`}
      />

      {/* Chat Area */}
      <ChatArea 
        group={selectedGroup} 
        onToggleSidebar={handleToggleGroupsSidebar} // Updated to correct handler
      />

      {/* Members Sidebar */}
      {/* TODO: Review if MembersSidebar needs specific width or if flex-shrink-0 is enough on desktop */}
      <MembersSidebar 
        group={selectedGroup} 
        className={`fixed inset-y-0 right-0 z-40 w-72 bg-white md:relative md:w-72 md:translate-x-0 transform transition-transform duration-300 ease-in-out border-l md:border-l-0 border-gray-200
          ${membersSidebarOpen ? 'translate-x-0' : 'translate-x-full'} md:flex flex-shrink-0`}
      />

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-20"> {/* z-20 to be above chat content but below sidebars */}
        <div className="flex items-center justify-around"> {/* Changed to justify-around for better spacing */}
          <button 
            className={`flex flex-col items-center space-y-1 p-2 ${groupsSidebarOpen ? 'text-groupme-blue' : 'text-gray-600'}`}
            onClick={handleToggleGroupsSidebar}
          >
            <div className={`w-6 h-6 rounded flex items-center justify-center ${groupsSidebarOpen ? 'bg-groupme-blue' : 'bg-gray-300'}`}>
              💬
            </div>
            <span className="text-xs">Groups</span>
          </button>
          <button 
            className={`flex flex-col items-center space-y-1 p-2 ${membersSidebarOpen ? 'text-groupme-blue' : 'text-gray-600'}`}
            onClick={handleToggleMembersSidebar} // Added handler
          >
            <div className={`w-6 h-6 rounded flex items-center justify-center ${membersSidebarOpen ? 'bg-groupme-blue' : 'bg-gray-300'}`}>
              👥
            </div>
            <span className="text-xs">Members</span>
          </button>
          <button className="flex flex-col items-center space-y-1 p-2 text-gray-600"> {/* Placeholder */}
            <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center">
              ⚙️
            </div>
            <span className="text-xs text-gray-600">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
