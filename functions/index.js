
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

/**
 * TR-ID 8: Push Notifications (FCM)
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

    const { senderId, senderName, text, imageUrl, fileUrl } = messageData;

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
      let messageContent = "Sent a new message";
      if (text) {
        messageContent = text;
      } else if (imageUrl) {
        messageContent = "Sent an image.";
      } else if (fileUrl) {
        messageContent = "Sent a file.";
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
    const userDocsPromises = userIds.map(id => admin.firestore().collection("users").doc(id).get());
    const userDocs = await Promise.all(userDocsPromises);

    const tokens = userDocs.reduce((acc, userDoc) => {
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                return acc.concat(userData.fcmTokens);
            }
        }
        return acc;
    }, []);

    const uniqueTokens = [...new Set(tokens)];

    if (uniqueTokens.length > 0) {
        console.log(`Sending notification to ${uniqueTokens.length} tokens.`);
        await admin.messaging().sendToDevice(uniqueTokens, payload);
    } else {
        console.log("No valid FCM tokens found for users.");
    }
}
