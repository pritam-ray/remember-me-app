/**
 * WhatsApp Service
 * Opens WhatsApp in your own self-chat with a pre-filled reminder message.
 * The message is sent from YOUR number to YOURSELF — no third-party service needed.
 * WhatsApp opens automatically; you tap Send once.
 */

import { Linking, Alert } from 'react-native';
import { format } from 'date-fns';

/**
 * Build a formatted event reminder message
 */
const buildEventMessage = (event) => {
  const eventDate = new Date(event.dateTime);
  const formattedDate = format(eventDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(eventDate, 'h:mm a');

  return `🔔 *RememberMe - Event Reminder*

📌 *${event.title}*
📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}
${event.description ? `📝 Details: ${event.description}` : ''}
${event.category ? `🏷️ Category: ${event.category}` : ''}

_Don't forget! This is your scheduled reminder._`;
};

/**
 * Open WhatsApp self-chat with a pre-filled event reminder.
 * Uses wa.me/[your_number] — message comes from YOUR number to YOURSELF.
 * @param {string} fullNumber - Full number with country code e.g. +919876543210
 * @param {object} event - Event object
 */
export const sendWhatsAppReminder = async (fullNumber, event) => {
  if (!fullNumber) {
    Alert.alert('Setup Required', 'Please set your WhatsApp number in Settings.');
    return false;
  }

  const message = buildEventMessage(event);
  return openWhatsAppSelfChat(fullNumber, message);
};

/**
 * Open WhatsApp self-chat with any custom message
 * @param {string} fullNumber - Full number with country code
 * @param {string} message - Text to pre-fill
 */
export const openWhatsAppSelfChat = async (fullNumber, message) => {
  const cleanNumber = fullNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);

  // wa.me with your own number opens your self-chat ("Message yourself")
  const url = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  const deepLink = `whatsapp://send?phone=${cleanNumber}&text=${encodedMessage}`;

  try {
    const canUseDeepLink = await Linking.canOpenURL(deepLink);
    await Linking.openURL(canUseDeepLink ? deepLink : url);
    return true;
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Make sure it is installed.');
    return false;
  }
};

/**
 * Send a test message to verify the number is correct
 */
export const sendTestWhatsAppMessage = async (fullNumber) => {
  return openWhatsAppSelfChat(
    fullNumber,
    '✅ *RememberMe Test*\n\nYour WhatsApp reminders are set up! When an event is due, WhatsApp will open here with a pre-filled reminder. Just tap Send. 🎉'
  );
};

/**
 * Send today\'s event summary to yourself
 */
export const sendDailySummary = async (fullNumber, events) => {
  if (!fullNumber || !events.length) return false;

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const eventList = events
    .map((e, i) => {
      const time = format(new Date(e.dateTime), 'h:mm a');
      return `${i + 1}. ${e.done ? '✅' : '⬜'} *${e.title}* at ${time}`;
    })
    .join('\n');

  const message = `📋 *RememberMe - Daily Summary*
📅 ${today}

${eventList}

_You have ${events.length} event${events.length > 1 ? 's' : ''} today!_`;

  return openWhatsAppSelfChat(fullNumber, message);
};

// Legacy export aliases (no-op apiKey param for backwards compat)
export const sendAutoWhatsAppMessage = async (fullNumber, _apiKey, message) =>
  openWhatsAppSelfChat(fullNumber, message);
export const sendWhatsAppDeepLink = sendWhatsAppReminder;

import { Linking, Alert } from 'react-native';
import { format } from 'date-fns';

// ═══════════════════════════════════════════════════════════════
// AUTOMATIC SENDING (CallMeBot API — no user tap needed)
// ═══════════════════════════════════════════════════════════════

/**
 * Send a WhatsApp message AUTOMATICALLY using CallMeBot API
 * @param {string} phoneNumber - Full phone number with country code (e.g., +919876543210)
 * @param {string} apiKey - CallMeBot API key
 * @param {string} message - The message text to send
 * @returns {{ success: boolean, error?: string }}
 */
export const sendAutoWhatsAppMessage = async (phoneNumber, apiKey, message) => {
  if (!phoneNumber || !apiKey) {
    return { success: false, error: 'Phone number or API key not configured' };
  }

  const cleanNumber = phoneNumber.replace(/[^0-9+]/g, '');
  const encodedMessage = encodeURIComponent(message);
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanNumber}&text=${encodedMessage}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // CallMeBot returns 200 on success
    if (response.ok) {
      const text = await response.text();
      console.log('CallMeBot response:', text);
      // Check if the response indicates an error
      if (text.toLowerCase().includes('error') && !text.toLowerCase().includes('no error')) {
        return { success: false, error: text };
      }
      return { success: true };
    } else {
      const text = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${text}` };
    }
  } catch (error) {
    console.error('CallMeBot API error:', error);
    return { success: false, error: error.message || 'Network error' };
  }
};

/**
 * Build a formatted event reminder message
 */
const buildEventMessage = (event) => {
  const eventDate = new Date(event.dateTime);
  const formattedDate = format(eventDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(eventDate, 'h:mm a');

  return `🔔 *RememberMe - Event Reminder*

📌 *${event.title}*
📅 Date: ${formattedDate}
⏰ Time: ${formattedTime}
${event.description ? `📝 Details: ${event.description}` : ''}
${event.category ? `🏷️ Category: ${event.category}` : ''}

_Don't forget! This is your scheduled reminder._`;
};

/**
 * Send an event reminder via WhatsApp AUTOMATICALLY
 * @param {string} phoneNumber - Full phone number with country code
 * @param {string} apiKey - CallMeBot API key
 * @param {object} event - Event object
 * @returns {{ success: boolean, error?: string }}
 */
export const sendWhatsAppReminder = async (phoneNumber, apiKey, event) => {
  if (!phoneNumber || !apiKey) {
    console.warn('WhatsApp auto-send: Missing phone number or API key');
    return { success: false, error: 'Not configured' };
  }

  const message = buildEventMessage(event);
  const result = await sendAutoWhatsAppMessage(phoneNumber, apiKey, message);

  if (!result.success) {
    console.warn('WhatsApp auto-send failed:', result.error);
  } else {
    console.log(`✅ WhatsApp reminder sent automatically for: ${event.title}`);
  }

  return result;
};

/**
 * Send a test message to verify setup
 */
export const sendTestWhatsAppMessage = async (phoneNumber, apiKey) => {
  return sendAutoWhatsAppMessage(
    phoneNumber,
    apiKey,
    '✅ *RememberMe Test*\n\nYour WhatsApp auto-messaging is working perfectly! 🎉'
  );
};

/**
 * Send a daily summary of today's events
 */
export const sendDailySummary = async (phoneNumber, apiKey, events) => {
  if (!phoneNumber || !apiKey || !events.length) {
    return { success: false, error: 'Missing params or no events' };
  }

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const eventList = events
    .map((e, i) => {
      const time = format(new Date(e.dateTime), 'h:mm a');
      return `${i + 1}. ${e.done ? '✅' : '⬜'} *${e.title}* at ${time}`;
    })
    .join('\n');

  const message = `📋 *RememberMe - Daily Summary*
📅 ${today}

${eventList}

_You have ${events.length} event${events.length > 1 ? 's' : ''} today!_`;

  return sendAutoWhatsAppMessage(phoneNumber, apiKey, message);
};

// ═══════════════════════════════════════════════════════════════
// FALLBACK: Deep-link approach (opens WhatsApp, user taps send)
// Used when API key is not set up
// ═══════════════════════════════════════════════════════════════

export const sendWhatsAppDeepLink = async (phoneNumber, event) => {
  if (!phoneNumber) {
    Alert.alert('WhatsApp Not Configured', 'Please set your WhatsApp number in Settings.');
    return false;
  }

  const message = buildEventMessage(event);
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `whatsapp://send?phone=${cleanNumber}&text=${encodedMessage}`;

  try {
    const canOpen = await Linking.canOpenURL(whatsappUrl);
    if (canOpen) {
      await Linking.openURL(whatsappUrl);
      return true;
    }
    await Linking.openURL(`https://wa.me/${cleanNumber}?text=${encodedMessage}`);
    return true;
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Make sure it is installed.');
    return false;
  }
};
