import { format } from "date-fns";
import { Reply, Heart, Check, CheckCheck } from "lucide-react";
import type { GroupMeMessage } from "@shared/schema";

interface MessageItemProps {
  message: GroupMeMessage;
  isOwnMessage: boolean;
  currentUserId?: string;
}

export function MessageItem({ message, isOwnMessage, currentUserId }: MessageItemProps) {
  const generateInitials = (name: string) => {
    return name.split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'h:mm a');
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

  if (message.system) {
    return (
      <div className="flex justify-center">
        <div className="bg-gray-100 text-gray-600 px-4 py-2 rounded-full text-sm">
          <span>{message.text}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start space-x-3 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
      <div className={`w-8 h-8 bg-gradient-to-br ${isOwnMessage ? 'from-groupme-blue to-blue-600' : getGradientClass(message.name)} rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0`}>
        {message.avatar_url ? (
          <img src={message.avatar_url} alt={message.name} className="w-full h-full rounded-full object-cover" />
        ) : (
          generateInitials(message.name)
        )}
      </div>
      
      <div className={`flex-1 ${isOwnMessage ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-center space-x-2 mb-1 ${isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''}`}>
          <span className="font-medium text-gray-900">{isOwnMessage ? 'You' : message.name}</span>
          <span className="text-xs text-gray-500">{formatTime(message.created_at)}</span>
          {!isOwnMessage && (
            <span className="text-xs text-groupme-blue bg-blue-50 px-2 py-1 rounded-full">via GroupMe</span>
          )}
          {isOwnMessage && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">sent via app</span>
              <CheckCheck className="w-3 h-3 text-green-500" />
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-2xl shadow-sm max-w-md ${
          isOwnMessage 
            ? 'bg-groupme-blue text-white rounded-tr-sm' 
            : 'bg-white text-gray-900 rounded-tl-sm'
        }`}>
          <p>{message.text}</p>
          
          {/* Render attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index}>
                  {attachment.type === 'image' && attachment.url && (
                    <img 
                      src={attachment.url} 
                      alt="Attachment" 
                      className="rounded-lg w-full h-auto max-w-sm"
                    />
                  )}
                  {attachment.type === 'location' && (
                    <div className="bg-gray-100 p-2 rounded text-sm">
                      📍 Location shared
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className={`flex items-center mt-2 space-x-4 ${isOwnMessage ? 'text-right' : ''}`}>
          {!isOwnMessage ? (
            <>
              <button className="text-xs text-gray-500 hover:text-groupme-blue transition-colors">
                <Reply className="w-3 h-3 mr-1 inline" />
                Reply
              </button>
              <button className="text-xs text-gray-500 hover:text-red-500 transition-colors">
                <Heart className="w-3 h-3 mr-1 inline" />
                Like
              </button>
              {message.favorited_by.length > 0 && (
                <span className="text-xs text-gray-500">
                  {message.favorited_by.length} ❤️
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">Delivered to GroupMe</span>
          )}
        </div>
      </div>
    </div>
  );
}
