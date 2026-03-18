# Chat System Documentation

## Overview

The chat system provides real-time messaging capabilities using Socket.io for WebSocket communication, with REST API fallback for when WebSocket is unavailable.

## Architecture

### Backend Components

1. **WebSocket Server** (`src/lib/socket-server.ts`)
   - Socket.io server with NextAuth authentication
   - Real-time message delivery
   - Typing indicators
   - Online/offline status

2. **Chat Permissions** (`src/lib/chat-permissions.ts`)
   - Access control for chat rooms
   - Direct message restrictions (students can't message other students)
   - Gender-based restrictions (male students can't message female teachers directly)
   - Message edit/delete permissions

3. **REST API** (`src/app/api/chat/*`)
   - `/api/chat/rooms` - List user's chat rooms
   - `/api/chat/rooms/direct` - Create/get direct chat
   - `/api/chat/rooms/[roomId]` - Get room details
   - `/api/chat/rooms/[roomId]/messages` - Get message history
   - `/api/chat/messages` - Send message (fallback)
   - `/api/chat/messages/[messageId]` - Edit/delete message

### Frontend Components

1. **ChatProvider** (`src/components/chat/ChatProvider.tsx`)
   - React Context for Socket.io client
   - Connection management
   - Automatic reconnection

2. **ChatInterface** (`src/components/chat/ChatInterface.tsx`)
   - Main chat UI container
   - Manages chat list and chat window

3. **ChatList** (`src/components/chat/ChatList.tsx`)
   - Displays user's chat rooms
   - Shows last message and unread count
   - Supports GROUP and DIRECT chats

4. **ChatWindow** (`src/components/chat/ChatWindow.tsx`)
   - Message display with auto-scroll
   - Real-time message updates
   - Typing indicators
   - Message history loading

5. **MessageInput** (`src/components/chat/MessageInput.tsx`)
   - Auto-resizing textarea
   - Typing indicator triggers
   - Enter to send, Shift+Enter for new line

6. **MessageItem** (`src/components/chat/MessageItem.tsx`)
   - Individual message display
   - Edit/delete actions
   - Timestamp and edited indicator

7. **TypingIndicator** (`src/components/chat/TypingIndicator.tsx`)
   - Shows when other users are typing

## Features

### Group Chat
- Automatically created when a stream is created
- All enrolled students + teacher can participate
- Teacher can delete any message
- Can be disabled per stream (`Stream.chatEnabled`)

### Direct Messages
- Student ↔ Teacher (only if enrolled in their stream)
- Teacher ↔ Teacher
- Admin/Moderator ↔ Anyone

### Restrictions
- Students cannot message other students directly
- Male students cannot message female teachers directly (gender restriction)
- Students can only message teachers they study with

### Message Features
- Send text messages (max 5000 characters)
- Edit own messages (within 15 minutes)
- Delete own messages (soft delete)
- Teachers can delete any message in their group chats
- Message history with pagination

### Real-time Features
- Instant message delivery via WebSocket
- Typing indicators (3-second timeout)
- Online/offline status
- Automatic reconnection on disconnect

## Database Schema

```prisma
model ChatRoom {
  id             String       @id @default(uuid())
  type           ChatRoomType // GROUP or DIRECT
  streamId       String?      @unique
  participant1Id String?
  participant2Id String?
  createdAt      DateTime     @default(now())
  messages       ChatMessage[]
}

model ChatMessage {
  id        String    @id @default(uuid())
  roomId    String
  senderId  String
  content   String    @db.Text
  isEdited  Boolean   @default(false)
  editedAt  DateTime?
  isDeleted Boolean   @default(false)
  deletedAt DateTime?
  createdAt DateTime  @default(now())
}
```

## WebSocket Events

### Client → Server
- `room:join` - Join a chat room
- `room:leave` - Leave a chat room
- `message:send` - Send a message
- `message:edit` - Edit a message
- `message:delete` - Delete a message
- `typing:start` - Start typing
- `typing:stop` - Stop typing

### Server → Client
- `message:receive` - New message received
- `message:edited` - Message was edited
- `message:deleted` - Message was deleted
- `typing:user` - User is typing
- `typing:stop` - User stopped typing
- `user:online` - User came online
- `user:offline` - User went offline

## Usage

### Starting the Server

The custom server integrates Socket.io with Next.js:

```bash
npm run dev  # Uses server.js instead of next dev
```

### Accessing Chat

Navigate to `/chat` when authenticated. The chat interface will load with:
- List of available chats (group chats from enrollments + direct chats)
- Click a chat to open the chat window
- Send messages, see typing indicators, etc.

### Creating Direct Chat

To start a direct message with a user:

```typescript
const response = await fetch('/api/chat/rooms/direct', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ recipientId: 'user-id' })
});
const { room } = await response.json();
```

## Security

- All WebSocket connections require NextAuth authentication
- Access control enforced on both WebSocket and REST API
- Gender-based restrictions for direct messages
- Teachers can only delete messages in their own group chats
- Message edit window limited to 15 minutes

## Testing

Tests are located in:
- `src/lib/__tests__/chat-permissions.test.ts` - Permission logic tests
- `src/lib/__tests__/chat-api.test.ts` - API integration tests

Run tests:
```bash
npm test -- chat
```

## Future Enhancements

- File/image sharing
- Voice messages
- Read receipts
- Message reactions
- Search messages
- Pin important messages
- Mute notifications per chat
