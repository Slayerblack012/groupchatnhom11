# **App Name**: GroupTalk

## Core Features:

- Google Sign-In: Authenticate users via Google Sign-In, displaying their profile information upon successful login.
- Group Creation: Allow users to create new groups by providing a group name. Generate a unique Group ID upon creation, assign the creator as 'admin', and display the Group ID for sharing.
- Group Joining: Enable users to join existing groups using a Group ID. Validate the ID and add the user to the group's member list upon successful validation.
- Member Management: Provide an interface visible only to the group 'admin' for managing group members. Admins can add members using their Google UID or email and remove existing members.
- Real-time Messaging: Implement real-time text messaging using Firestore onSnapshot listeners, displaying the sender's name/photo and timestamp with minimal latency.
- File Uploading: Allow users to upload images and files (max 20MB), compress images before upload, display a progress bar during upload, and show uploaded images inline while displaying other files as clickable links.
- Push Notifications: Use Cloud Functions to send FCM push notifications to group members upon new messages, with the notification payload including the sender's name and message content.
- Light/Dark Mode Toggle: Implement a toggle for switching between light and dark themes, persisting the user's choice in localStorage.

## Style Guidelines:

- Primary color: A cool blue (#4285F4) to represent communication and trust.
- Background color: Light theme uses a very light gray (#F5F5F5), while dark theme uses a dark gray (#333333).
- Accent color: An energetic orange (#FF9800) for interactive elements and notifications.
- Body and headline font: 'Inter' sans-serif for a modern and neutral feel.
- Use clean, simple icons from a library like Material Icons for common actions (send, upload, settings, etc.).
- Utilize a clean and responsive layout using TailwindCSS grid and flexbox to ensure the chat is easily accessible and functions well on all screen sizes.
- Implement subtle animations (e.g., a gentle fade-in for new messages) to provide visual feedback and enhance the user experience.