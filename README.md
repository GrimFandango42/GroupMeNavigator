# GroupMe Bridge

A custom UI layer for GroupMe that enables a gradual transition away from the platform while maintaining seamless communication with your group.

## 🎯 Project Vision

This application implements a four-phase strategy to gradually migrate your group chat away from GroupMe:

### Phase 1: Basic GroupMe client (Current) ✅
- Real-time view of GroupMe chats
- Ability to switch between different GroupMe chats
- Display latest messages from GroupMe

### Phase 2: Reply functionality (Planned)
- Enable replying to GroupMe messages from the custom UI

### Phase 3: Backend for new group chats (Planned)
- Develop backend infrastructure for creating new group chats
- Invite friends to join these new, custom groups
- Messages in these new groups will be stored on our own backend

### Phase 4: Full Custom GroupMe Alternative (Future)
- Expand the application to be a full-fledged alternative to GroupMe
- Develop both frontend and backend components for a complete custom chat experience
- Independent of GroupMe infrastructure
- Customizable features tailored to your group's needs

## 🚀 Current Features

- **Real-time Messaging**: Send and receive messages that sync with GroupMe instantly
- **Groups Sidebar**: View all your GroupMe groups with member counts and recent messages
- **Members Panel**: See who's using the bridge app vs. standard GroupMe
- **Connection Status**: Live indicators showing API and WebSocket connectivity
- **Mobile Responsive**: Optimized interface for desktop and mobile devices
- **GroupMe Design**: Familiar blue color scheme and UI patterns

## 🛠️ Technical Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express
- **Real-time**: WebSocket connections for live updates
- **API**: GroupMe REST API integration
- **UI Components**: Shadcn/ui component library
- **State Management**: TanStack Query for data fetching and caching

## 📋 Prerequisites

- Node.js 20 or higher
- GroupMe account and API token
- Internet connection for GroupMe API access

## 🔧 Setup Instructions

1. **Get your GroupMe API Token**
   - Visit [https://dev.groupme.com/](https://dev.groupme.com/)
   - Sign in with your GroupMe account
   - Copy your API token from the developer dashboard

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   - Add your `GROUPME_API_TOKEN` to the environment variables
   - The application will automatically detect and use your token

4. **Start the Application**
   ```bash
   npm run dev
   ```
   - Server runs on port 5000
   - Frontend and backend served together
   - Hot reload enabled for development

## 🎮 How to Use

1. **Launch the App**: Navigate to the running application in your browser
2. **View Groups**: Your GroupMe groups will appear in the left sidebar
3. **Select a Group**: Click any group to view messages and start chatting
4. **Send Messages**: Type in the message box - messages sync to GroupMe automatically
5. **Monitor Status**: Check connection indicators in the header and chat area

## 📱 Interface Overview

- **Groups Sidebar**: Lists all your GroupMe groups with search functionality
- **Chat Area**: Main messaging interface with real-time updates
- **Members Panel**: Shows group members and their platform usage
- **Connection Status**: Displays API connectivity and sync status
- **Mobile View**: Responsive design with bottom navigation

## 🔄 Real-time Sync

The bridge maintains seamless synchronization:
- Messages you send appear immediately in GroupMe for other users
- Messages from GroupMe users appear in your custom interface
- WebSocket connections provide instant updates
- Automatic reconnection if connectivity is lost

## 🗂️ Project Structure

```
├── client/
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # API client and utilities
│   │   └── pages/         # Application pages
├── server/
│   ├── index.ts          # Express server setup
│   ├── routes.ts         # API routes and WebSocket
│   └── storage.ts        # In-memory caching
└── shared/
    └── schema.ts         # TypeScript types
```

## 🔐 Security & Privacy

- API token stored securely as environment variable
- All communication encrypted via HTTPS
- No message storage - everything flows through GroupMe
- WebSocket connections secured and authenticated

## 🚧 Development Roadmap

### Phase 1 Features (Current)
- [x] Real-time GroupMe chat view
- [x] Switch between chats
- [x] Display latest messages

### Phase 2 Features (Next)
- [ ] Implement reply functionality to GroupMe messages from custom UI

### Phase 3 Features (Planned)
- [ ] Backend development for custom group chats
- [ ] User invitation system for new groups
- [ ] Database integration for custom chat storage

### Phase 4 Features (Future)
- [ ] Full frontend development for custom chat experience
- [ ] Full backend development for custom chat platform
- [ ] Advanced group management features
- [ ] File sharing and media support
- [ ] Custom notification settings
- [ ] Group customization features
- [ ] Complete GroupMe independence

## 🤝 Contributing to the Transition

This bridge app is designed to be your pilot testing ground. As you use it:
1. Identify features you love about the custom interface
2. Note areas where GroupMe's limitations become apparent
3. Plan which friends to invite to Phase 2 first
4. Gradually reduce dependence on GroupMe's native apps

## 🆘 Troubleshooting

**Connection Issues**
- Verify your GroupMe API token is correct
- Check internet connectivity
- Look for API rate limiting (reconnects automatically)

**Missing Messages**
- Messages sync in real-time when connected
- Refresh the page to reload recent messages
- Check GroupMe's API status if issues persist

**Mobile Interface**
- Use the bottom navigation to switch between views
- Tap the menu button to access groups sidebar
- Interface optimized for touch interactions

## 📄 License

This project is designed for personal use in transitioning away from GroupMe. Respect GroupMe's API terms of service and use responsibly.

---

**Ready to start your GroupMe transition?** 🚀

This bridge represents the first step toward chat independence. As you and your friends gradually adopt the custom interface, you'll be building toward a more flexible, customizable communication platform that serves your group's specific needs.