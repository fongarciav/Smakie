# Security Specification: VozDeObra Walkie-Talkie

## 1. Data Invariants
1. **User Identity Invariant**: A user profile document `/users/{userId}` can only be created and updated by the authenticated user whose `request.auth.uid == userId`.
2. **Channel Membership Invariant**: A user can only access `/channels/{channelId}` and its subcollections (`messages`, `reports`) if they are in `members` array or are creating/joining the channel.
3. **Channel Message Invariant**: Only members of the channel can post a message. The `authorId` must strictly equal `request.auth.uid`. A message cannot be modified by other users (only transcript updates from author or system, or immutable once completed).
4. **Report Access Invariant**: Only channel members can read or generate reports for that channel.
5. **Payload Size Boundary**: Audio data strings in message documents must not exceed 1MB (enforcing base64 audio payload limits suitable for 60s voice notes).
6. **Presence/Speaker Integrity**: Active speaker updates can only set the speaker to `request.auth.uid` or clear it (`null`).

## 2. The "Dirty Dozen" Payloads (Must Return PERMISSION_DENIED)
1. **Spoofed User Profile**: An authenticated user `userA` attempts to write or overwrite `/users/userB`.
2. **Channel Creation with Spoofed Creator**: Payload where `creatorId: 'userB'` while `request.auth.uid == 'userA'`.
3. **Unauthenticated Read of Channel**: An unauthenticated request tries to read `/channels/{channelId}`.
4. **Non-member Reading Channel Messages**: Authenticated user `userC` who is NOT in `channel.members` tries to query `/channels/{channelId}/messages`.
5. **Non-member Posting Message**: Authenticated user `userC` tries to write to `/channels/{channelId}/messages/{msgId}` without being a member.
6. **Message Author Spoofing**: User `userA` creates a message with `authorId: 'userB'`.
7. **Message Transcript Injection by Third Party**: User `userB` tries to edit the transcript or audio of a message created by `userA`.
8. **Malicious Active Speaker Hijack**: User `userA` updates `channels/{channelId}.activeSpeaker` claiming `userB` is speaking.
9. **Oversized Audio Attack**: Message payload containing `audioData` exceeding 1MB.
10. **Report Author Spoofing**: User `userA` attempts to create a report with `createdById: 'userB'`.
11. **Non-member Reading Reports**: Authenticated user `userC` who is not a member tries to read `/channels/{channelId}/reports`.
12. **Arbitrary Field Injection (Shadow Update)**: User injects unexpected administrative or elevated privilege fields into a channel or message.
