
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * This function triggers on new message creation in any group's message subcollection.
 * It sends a push notification to all other members of the group.
 */
exports.sendGroupChatNotification = functions.firestore
  .document("groups/{groupId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const { groupId } = context.params;
    const messageData = snap.data();

    if (!messageData) {
      console.log("No message data found.");
      return null;
    }

    const { senderId, senderName, text, contentType, fileName } = messageData;

    try {
      // 1. Get group details to find members and group name
      const groupDoc = await admin.firestore().collection("groups").doc(groupId).get();
      if (!groupDoc.exists) {
        console.log("Group not found:", groupId);
        return null;
      }
      const groupData = groupDoc.data();
      const memberIds = groupData.members || [];
      const groupName = groupData.name || "a group";

      // 2. Determine message content for notification
      let messageContent;
      switch (contentType) {
        case 'text':
            messageContent = text;
            break;
        case 'image':
            messageContent = "Sent an image.";
            break;
        case 'video':
            messageContent = "Sent a video.";
            break;
        case 'file':
            messageContent = `Sent a file: ${fileName || 'attachment'}`;
            break;
        default:
            messageContent = "Sent a new message";
      }

      // Truncate long messages
      if (messageContent.length > 100) {
        messageContent = messageContent.substring(0, 97) + "...";
      }
      
      const payload = {
        notification: {
          title: `New message in ${groupName}`,
          body: `${senderName}: ${messageContent}`,
        },
        data: {
          groupId: groupId
        }
      };

      // 3. Get FCM tokens for all members except the sender
      const otherMemberIds = memberIds.filter(id => id !== senderId);
      if (otherMemberIds.length === 0) {
        console.log("No other members to notify.");
        return null;
      }

      await sendPayloadToUsers(otherMemberIds, payload);

      return null;
    } catch (error) {
      console.error("Error sending notification for group", groupId, error);
      return null;
    }
  });


async function sendPayloadToUsers(userIds, payload) {
    // Firestore 'in' query limit is 30
    const userChunks = [];
    for (let i = 0; i < userIds.length; i += 30) {
        userChunks.push(userIds.slice(i, i + 30));
    }
    
    let allTokens = [];

    for (const chunk of userChunks) {
        const usersQuery = await admin.firestore().collection("users").where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        const tokensForChunk = usersQuery.docs.reduce((acc, userDoc) => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                    return acc.concat(userData.fcmTokens);
                }
            }
            return acc;
        }, []);
        allTokens.push(...tokensForChunk);
    }
    
    const uniqueTokens = [...new Set(allTokens)];

    if (uniqueTokens.length > 0) {
        console.log(`Sending notification to ${uniqueTokens.length} tokens.`);
        const response = await admin.messaging().sendToDevice(uniqueTokens, payload);
        // Optional: Clean up invalid tokens
        const tokensToRemove = [];
        response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
                console.error('Failure sending notification to', uniqueTokens[index], error);
                if (error.code === 'messaging/invalid-registration-token' ||
                    error.code === 'messaging/registration-token-not-registered') {
                    tokensToRemove.push(uniqueTokens[index]);
                }
            }
        });
        // Here you could implement logic to remove `tokensToRemove` from your user documents.
    } else {
        console.log("No valid FCM tokens found for users.");
    }
}
