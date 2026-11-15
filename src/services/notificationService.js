import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Set global notification handler behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

/**
 * Request permissions and get the Expo Push Token.
 * @returns {Promise<string|undefined>} The push token if successful.
 */
export const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        try {
            // Get projectId from Constants (or hardcode from app.json if it fails)
            const projectId =
                Constants?.expoConfig?.extra?.eas?.projectId ?? 'b8d6cbfa-980f-498a-950b-c183b8977b26';
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('Expo Push Token generated: ', token);
        } catch (e) {
            console.log('Error generating push token:', e);
        }
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    return token;
};

/**
 * Schedule a local notification.
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Date} date - Date object for when to trigger the notification
 */
export const scheduleLocalNotification = async (title, body, date) => {
    try {
        const triggerId = await Notifications.scheduleNotificationAsync({
            content: {
                title: title,
                body: body,
                sound: true,
            },
            trigger: {
                type: Notifications.SchedulableTriggerInputTypes.DATE,
                date: date,
                channelId: 'default'
            },
        });
        console.log(`Notification scheduled (ID: ${triggerId}): ${title} on ${date.toLocaleString()}`);
        return triggerId;
    } catch (error) {
        console.error('Error scheduling notification:', error);
    }
};

export default {
    registerForPushNotificationsAsync,
    scheduleLocalNotification,
};
