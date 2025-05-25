import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GroupMeAPI } from "@/lib/groupme-api";
import { useWebSocket } from "@/hooks/use-websocket";
import { MessageItem } from "./MessageItem";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Menu, Info, Paperclip, Smile, Send, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import type { GroupMeGroup, GroupMeMessage } from "@shared/schema";

interface ChatAreaProps {
  group?: GroupMeGroup;
  onToggleSidebar: () => void;
}

export function ChatArea({ group, onToggleSidebar }: ChatAreaProps) {
  const [messageText, setMessageText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: currentUser } = useQuery({
    queryKey: ['/api/me'],
  });

  const { data: status } = useQuery({
    queryKey: ['/api/status'],
    refetchInterval: 10000,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<GroupMeMessage[]>({
    queryKey: ['/api/groups', group?.id, 'messages'],
    enabled: !!group?.id,
    refetchInterval: 5000, // Poll for new messages every 5 seconds
    onSuccess: (fetchedMessages) => {
      console.log('[ChatArea] Fetched messages for group', group?.id, ':', fetchedMessages.length, 'messages');
    },
  });

  const { isConnected, lastMessage } = useWebSocket(group?.id);

  const sendMessageMutation = useMutation({
    mutationFn: (text: string) => {
      if (!group?.id) throw new Error('No group selected');
      return GroupMeAPI.sendMessage(group.id, text);
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group?.id, 'messages'] });
      toast({
        title: "Message sent",
        description: "Your message was sent to GroupMe successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to send message",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  // Handle real-time message updates
  useEffect(() => {
    if (lastMessage?.type === 'new_message' && lastMessage.groupId === group?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/groups', group?.id, 'messages'] });
    }
  }, [lastMessage, group?.id, queryClient]);

  // Log group change
  useEffect(() => {
    console.log('[ChatArea] Group changed to:', group?.id, group?.name);
  }, [group]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle textarea auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 128) + 'px';
    }
  }, [messageText]);

  const handleSendMessage = () => {
    const text = messageText.trim();
    if (!text || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      // Reset typing indicator after 3 seconds
      setTimeout(() => setIsTyping(false), 3000);
    }
  };

  if (!group) {
    return (
      <div className="flex-1 flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
              <Menu className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium mb-2">Select a group to start chatting</h3>
            <p className="text-sm">Choose a group from the sidebar to view and send messages</p>
          </div>
        </div>
      </div>
    );
  }

  // Sort messages by created_at (oldest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="md:hidden p-2" 
              onClick={onToggleSidebar}
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="w-10 h-10 bg-gradient-to-br from-groupme-blue to-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
              {group.image_url ? (
                <img src={group.image_url} alt={group.name} className="w-full h-full rounded-lg object-cover" />
              ) : (
                group.name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2)
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{group.name}</h2>
              <p className="text-sm text-gray-500">{group.members.length} members</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* API Status Indicator */}
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs ${
              status?.connected 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {status?.connected ? (
                <>
                  <Wifi className="w-3 h-3" />
                  <span>GroupMe Synced</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  <span>Disconnected</span>
                </>
              )}
            </div>
            
            <Button variant="ghost" size="sm">
              <Info className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center text-gray-500">
              <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
                💬
              </div>
              <p>No messages yet. Be the first to say something!</p>
            </div>
          </div>
        ) : (
          sortedMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwnMessage={message.user_id === currentUser?.id}
              currentUserId={currentUser?.id}
            />
          ))
        )}
        
        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 text-sm">
              ?
            </div>
            <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
            <span className="text-xs text-gray-500">Someone is typing...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-end space-x-3">
          <Button variant="ghost" size="sm">
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              placeholder="Type a message... (will sync to GroupMe)"
              value={messageText}
              onChange={(e) => {
                setMessageText(e.target.value);
                handleTyping();
              }}
              onKeyDown={handleKeyDown}
              className="resize-none"
              rows={1}
            />
            
            {/* Rate limit warning */}
            {sendMessageMutation.isPending && (
              <div className="absolute -top-8 left-0 right-0 text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded">
                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                Sending message...
              </div>
            )}
          </div>
          
          <Button variant="ghost" size="sm">
            <Smile className="w-4 h-4" />
          </Button>
          
          <Button 
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className="bg-groupme-blue hover:bg-blue-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Connection Status */}
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${status?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>{status?.connected ? 'Connected to GroupMe API' : 'Disconnected from GroupMe API'}</span>
            {isConnected && <span>• WebSocket connected</span>}
          </div>
          <div className="flex items-center space-x-4">
            <span>Last sync: just now</span>
          </div>
        </div>
      </div>
    </div>
  );
}
