/**
 * WhatsApp Service
 *
 * PRIMARY (automatic):  Green API — https://green-api.com
 *   Free plan: 500 messages/month.
 *   Setup: scan QR code once → get Instance ID + API Token.
 *   Messages are sent FROM YOUR OWN WhatsApp number TO YOURSELF — fully automatic.
 *
 * FALLBACK (manual):  wa.me self-chat deep link
 *   If Green API is not configured, WhatsApp opens with the message pre-filled.
 *   User must tap Send once.
 */

import { Linking, Alert } from 'react-native';
import { format } from 'date-fns';
import { getSettings } from './storage';

// ─── Message Builder ─────────────────────────────────────────

const buildEventMessage = (event) => {
  const eventDate = new Date(event.dateTime);
  const formattedDate = format(eventDate, 'EEEE, MMMM d, yyyy');
  const formattedTime = format(eventDate, 'h:mm a');

  return (
    `🔔 *RememberMe — Event Reminder*\n\n` +
    `📌 *${event.title}*\n` +
    `📅 Date: ${formattedDate}\n` +
    `⏰ Time: ${formattedTime}\n` +
    (event.description ? `📝 Details: ${event.description}\n` : '') +
    (event.category ? `🏷️ Category: ${event.category}\n` : '') +
    `\n_Sent automatically by RememberMe._`
  );
};

// ═══════════════════════════════════════════════════════════════
// GREEN API — Fully Automatic (no tap required)
// ═══════════════════════════════════════════════════════════════

/**
 * Send a WhatsApp message automatically using Green API.
 * Message goes from YOUR linked WhatsApp → to yourself (or any number).
 * @param {string} instanceId  - Green API instance ID  (e.g. "1101234567")
 * @param {string} apiToken    - Green API API token
 * @param {string} fullNumber  - Recipient number with country code (e.g. "+919876543210")
 * @param {string} message     - Message text
 * @returns {{ success: boolean, error?: string }}
 */
export const sendViaGreenAPI = async (instanceId, apiToken, fullNumber, message) => {
  if (!instanceId || !apiToken || !fullNumber) {
    return { success: false, error: 'Green API credentials or phone number missing.' };
  }

  // Green API chatId format: "919876543210@c.us" (no + sign)
  const cleanNumber = fullNumber.replace(/[^0-9]/g, '');
  const chatId = `${cleanNumber}@c.us`;
  const url = `https://api.green-api.com/waInstance${instanceId}/sendMessage/${apiToken}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, message }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Green API HTTP ${response.status}: ${text}` };
    }

    const data = await response.json();
    if (data?.idMessage) {
      console.log('✅ Green API: message sent, id =', data.idMessage);
      return { success: true };
    }
    return { success: false, error: JSON.stringify(data) };
  } catch (err) {
    console.error('Green API network error:', err);
    return { success: false, error: err.message || 'Network error' };
  }
};

// ═══════════════════════════════════════════════════════════════
// SELF-CHAT DEEP LINK — Fallback (requires 1 tap on Send)
// ═══════════════════════════════════════════════════════════════

export const openWhatsAppSelfChat = async (fullNumber, message) => {
  const cleanNumber = fullNumber.replace(/[^0-9]/g, '');
  const encodedMessage = encodeURIComponent(message);
  const deepLink = `whatsapp://send?phone=${cleanNumber}&text=${encodedMessage}`;
  const webUrl   = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;

  try {
    const canDeepLink = await Linking.canOpenURL(deepLink);
    await Linking.openURL(canDeepLink ? deepLink : webUrl);
    return true;
  } catch (error) {
    console.error('Error opening WhatsApp:', error);
    Alert.alert('WhatsApp Error', 'Could not open WhatsApp. Make sure it is installed.');
    return false;
  }
};

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Send an event reminder.
 * → AUTOMATIC via Green API if credentials are configured.
 * → Falls back to WhatsApp self-chat deep link if not.
 */
export const sendWhatsAppReminder = async (fullNumber, event) => {
  if (!fullNumber) {
    Alert.alert('Setup Required', 'Please set your WhatsApp number in Settings.');
    return false;
  }

  const message = buildEventMessage(event);
  const settings = await getSettings();

  if (settings.greenApiInstanceId && settings.greenApiToken) {
    const result = await sendViaGreenAPI(
      settings.greenApiInstanceId,
      settings.greenApiToken,
      fullNumber,
      message
    );
    if (result.success) return true;
    console.warn('Green API failed, opening self-chat as fallback:', result.error);
  }

  // No Green API (or it failed) → open self-chat deep link
  return openWhatsAppSelfChat(fullNumber, message);
};

/**
 * Send a test message to verify Green API (or deep link) works.
 * Returns { success: boolean, error?: string }
 */
export const sendTestWhatsAppMessage = async (fullNumber) => {
  if (!fullNumber) {
    Alert.alert('Missing Number', 'Please enter your WhatsApp number in Settings first.');
    return { success: false, error: 'No number' };
  }

  const testMsg =
    '✅ *RememberMe — Test Message*\n\n' +
    'Your WhatsApp reminders are working! 🎉\n' +
    'Events will be sent to this number automatically.';

  const settings = await getSettings();

  if (settings.greenApiInstanceId && settings.greenApiToken) {
    return sendViaGreenAPI(
      settings.greenApiInstanceId,
      settings.greenApiToken,
      fullNumber,
      testMsg
    );
  }

  const ok = await openWhatsAppSelfChat(fullNumber, testMsg);
  return { success: ok };
};

/**
 * Send today's event summary.
 */
export const sendDailySummary = async (fullNumber, events) => {
  if (!fullNumber || !events.length) {
    return { success: false, error: 'Missing params or no events' };
  }

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');
  const eventList = events
    .map((e, i) => {
      const time = format(new Date(e.dateTime), 'h:mm a');
      return `${i + 1}. ${e.done ? '✅' : '⬜'} *${e.title}* at ${time}`;
    })
    .join('\n');

  const message =
    `📋 *RememberMe — Daily Summary*\n` +
    `📅 ${today}\n\n` +
    `${eventList}\n\n` +
    `_You have ${events.length} event${events.length > 1 ? 's' : ''} today!_`;

  const settings = await getSettings();

  if (settings.greenApiInstanceId && settings.greenApiToken) {
    return sendViaGreenAPI(
      settings.greenApiInstanceId,
      settings.greenApiToken,
      fullNumber,
      message
    );
  }

  const ok = await openWhatsAppSelfChat(fullNumber, message);
  return { success: ok };
};

// Legacy aliases
export const sendAutoWhatsAppMessage = (_num, _key, msg) => openWhatsAppSelfChat(_num, msg);
export const sendWhatsAppDeepLink    = sendWhatsAppReminder;
