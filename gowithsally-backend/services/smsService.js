// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - sendSMS() function entry
// - sendWhatsApp() function entry
// - Other exported functions

console.log('📄 smsService.js ▶ Module loaded');

// backend/src/services/smsService.js
// Service SMS Go With Sally

const twilio = require('twilio');

// Configuration Twilio
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
const whatsappPhone = process.env.TWILIO_WHATSAPP_NUMBER;

let client = null;

// Initialiser le client si les credentials sont disponibles
if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

/**
 * Envoyer un SMS
 */
exports.sendSMS = async (to, message) => {
  console.log(`[SMS] Sending to ${to}: ${message.substring(0, 50)}...`);
  
  // En mode développement sans credentials, simuler
  if (!client) {
    console.log('[SMS] No Twilio client, simulating send');
    return { success: true, simulated: true };
  }
  
  try {
    const result = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: to
    });
    
    console.log(`[SMS] Sent successfully: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('[SMS] Send error:', error);
    throw error;
  }
};

/**
 * Envoyer un message WhatsApp
 */
exports.sendWhatsApp = async (to, message) => {
  console.log(`[WhatsApp] Sending to ${to}: ${message.substring(0, 50)}...`);
  
  // En mode développement sans credentials, simuler
  if (!client) {
    console.log('[WhatsApp] No Twilio client, simulating send');
    return { success: true, simulated: true };
  }
  
  try {
    // Format WhatsApp: whatsapp:+212XXXXXXXXX
    const whatsappTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const whatsappFrom = whatsappPhone.startsWith('whatsapp:') 
      ? whatsappPhone 
      : `whatsapp:${whatsappPhone}`;
    
    const result = await client.messages.create({
      body: message,
      from: whatsappFrom,
      to: whatsappTo
    });
    
    console.log(`[WhatsApp] Sent successfully: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('[WhatsApp] Send error:', error);
    throw error;
  }
};

/**
 * Passer un appel vocal avec OTP
 */
exports.makeVoiceCall = async (to, otp) => {
  console.log(`[Voice] Calling ${to} with OTP`);
  
  if (!client) {
    console.log('[Voice] No Twilio client, simulating call');
    return { success: true, simulated: true };
  }
  
  try {
    // TwiML pour lire le code
    const twiml = `
      <Response>
        <Say language="ar-MA">
          مرحباً، رمز التحقق الخاص بك هو
        </Say>
        <Say language="ar-MA">
          ${otp.split('').join(', ')}
        </Say>
        <Pause length="1"/>
        <Say language="ar-MA">
          أكرر، رمز التحقق هو
        </Say>
        <Say language="ar-MA">
          ${otp.split('').join(', ')}
        </Say>
        <Say language="ar-MA">
          شكراً لاستخدامك Sally
        </Say>
      </Response>
    `;
    
    const result = await client.calls.create({
      twiml: twiml,
      from: twilioPhone,
      to: to
    });
    
    console.log(`[Voice] Call initiated: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('[Voice] Call error:', error);
    throw error;
  }
};

/**
 * Vérifier le statut d'un message
 */
exports.getMessageStatus = async (sid) => {
  if (!client) {
    return { status: 'simulated' };
  }
  
  try {
    const message = await client.messages(sid).fetch();
    return {
      status: message.status,
      errorCode: message.errorCode,
      errorMessage: message.errorMessage
    };
  } catch (error) {
    console.error('[SMS] Status check error:', error);
    throw error;
  }
};