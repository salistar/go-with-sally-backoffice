// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - initTransporter() function entry
// - All exported function entries

console.log('📄 emailService.js ▶ Module loaded');

// backend/src/services/emailService.js
// Service Email Go With Sally

const nodemailer = require('nodemailer');

// Configuration du transporteur
let transporter = null;

const initTransporter = () => {
  console.log('📄 emailService.js ▶ initTransporter() called');
  if (transporter) return transporter;

  // Utiliser les variables d'environnement
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  };
  
  // En développement sans config, utiliser ethereal
  if (!config.auth.user) {
    console.log('[Email] No SMTP config, using ethereal for testing');
    return null;
  }
  
  transporter = nodemailer.createTransport(config);
  return transporter;
};

/**
 * Envoyer un email de vérification
 */
exports.sendVerificationEmail = async (to, verificationUrl) => {
  console.log(`[Email] Sending verification to ${to}`);
  
  const transport = initTransporter();
  
  if (!transport) {
    console.log('[Email] No transporter, simulating send');
    console.log(`[Email] Verification URL: ${verificationUrl}`);
    return { success: true, simulated: true };
  }
  
  const mailOptions = {
    from: `"Go With Sally" <${process.env.SMTP_FROM || 'noreply@gowithsally.ma'}>`,
    to,
    subject: 'Vérifiez votre email - Go With Sally',
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #8E44AD 0%, #9B59B6 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; text-align: center; }
          .content p { color: #666; font-size: 16px; line-height: 1.6; }
          .button { display: inline-block; background: #8E44AD; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .button:hover { background: #7D3C98; }
          .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
          .logo { width: 80px; height: 80px; margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚗 Go With Sally</h1>
          </div>
          <div class="content">
            <h2>مرحباً!</h2>
            <p>شكراً لتسجيلك في Go With Sally. يرجى التحقق من بريدك الإلكتروني بالنقر على الزر أدناه.</p>
            <p style="direction: ltr;">Merci de vous être inscrit(e) sur Go With Sally. Veuillez vérifier votre email en cliquant sur le bouton ci-dessous.</p>
            <a href="${verificationUrl}" class="button">تحقق من البريد الإلكتروني / Vérifier l'email</a>
            <p style="font-size: 14px; color: #999;">هذا الرابط صالح لمدة 24 ساعة<br>Ce lien est valide pendant 24 heures</p>
          </div>
          <div class="footer">
            <p>© 2024 Go With Sally. جميع الحقوق محفوظة.</p>
            <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  try {
    const result = await transport.sendMail(mailOptions);
    console.log(`[Email] Sent successfully: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] Send error:', error);
    throw error;
  }
};

/**
 * Envoyer un email de réinitialisation de mot de passe
 */
exports.sendPasswordResetEmail = async (to, resetUrl) => {
  console.log(`[Email] Sending password reset to ${to}`);
  
  const transport = initTransporter();
  
  if (!transport) {
    console.log('[Email] No transporter, simulating send');
    console.log(`[Email] Reset URL: ${resetUrl}`);
    return { success: true, simulated: true };
  }
  
  const mailOptions = {
    from: `"Go With Sally" <${process.env.SMTP_FROM || 'noreply@gowithsally.ma'}>`,
    to,
    subject: 'Réinitialisation de mot de passe - Go With Sally',
    html: `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, sans-serif; background: #f5f5f5; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #E74C3C 0%, #C0392B 100%); padding: 30px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { padding: 40px; text-align: center; }
          .content p { color: #666; font-size: 16px; line-height: 1.6; }
          .button { display: inline-block; background: #E74C3C; color: white; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: bold; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 إعادة تعيين كلمة المرور</h1>
          </div>
          <div class="content">
            <p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. انقر على الزر أدناه للمتابعة.</p>
            <p style="direction: ltr;">Vous avez demandé une réinitialisation de mot de passe. Cliquez sur le bouton ci-dessous pour continuer.</p>
            <a href="${resetUrl}" class="button">إعادة تعيين كلمة المرور</a>
            <p style="font-size: 14px; color: #999;">هذا الرابط صالح لمدة ساعة واحدة<br>Ce lien est valide pendant 1 heure</p>
          </div>
          <div class="footer">
            <p>إذا لم تطلب إعادة تعيين كلمة المرور، تجاهل هذا البريد الإلكتروني.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };
  
  try {
    const result = await transport.sendMail(mailOptions);
    console.log(`[Email] Sent successfully: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] Send error:', error);
    throw error;
  }
};

/**
 * Envoyer une notification de document
 */
exports.sendDocumentNotification = async (to, status, documentType) => {
  console.log(`[Email] Sending document notification to ${to}`);
  
  const transport = initTransporter();
  
  if (!transport) {
    console.log('[Email] No transporter, simulating send');
    return { success: true, simulated: true };
  }
  
  const statusMessages = {
    verified: {
      subject: 'Document vérifié ✓',
      message: `Votre document "${documentType}" a été vérifié avec succès.`,
      color: '#27AE60'
    },
    rejected: {
      subject: 'Document rejeté ✗',
      message: `Votre document "${documentType}" a été rejeté. Veuillez en soumettre un nouveau.`,
      color: '#E74C3C'
    }
  };
  
  const statusInfo = statusMessages[status] || statusMessages.verified;
  
  const mailOptions = {
    from: `"Go With Sally" <${process.env.SMTP_FROM || 'noreply@gowithsally.ma'}>`,
    to,
    subject: `${statusInfo.subject} - Go With Sally`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${statusInfo.color};">${statusInfo.subject}</h2>
        <p>${statusInfo.message}</p>
        <p>Connectez-vous à l'application pour plus de détails.</p>
        <hr>
        <p style="color: #999; font-size: 12px;">Go With Sally - VTC Maroc</p>
      </div>
    `
  };
  
  try {
    const result = await transport.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[Email] Send error:', error);
    throw error;
  }
};