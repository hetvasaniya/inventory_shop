const nodemailer = require('nodemailer');

/**
 * Create a reusable email transporter.
 * Configured via environment variables.
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const user = process.env.SMTP_USER;
  // Clean up any spaces from App Password (e.g. "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
  const pass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');

  if (host.includes('gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

/**
 * Send an email with optional attachments.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text body
 * @param {string} options.html - HTML body (optional)
 * @param {Array} options.attachments - Array of nodemailer attachment objects (optional)
 * @returns {Promise<object>} Nodemailer send result
 */
const sendEmail = async ({ to, subject, text, html, attachments }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠ Email not sent: SMTP_USER or SMTP_PASS missing in server/.env.');
    return { accepted: [], rejected: [to], skipped: true };
  }

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"BizGrow" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
    };

    if (html) mailOptions.html = html;
    if (attachments) mailOptions.attachments = attachments;

    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (error) {
    console.error(`✗ Email sending failed to ${to}:`, error.message);
    if (error.message.includes('Invalid login') || error.code === 'EAUTH' || error.responseCode === 535) {
      console.error(
        '  👉 Gmail SMTP Notice: Ensure you are using a 16-character Google App Password (not standard account password).\n' +
        '     Generate one at: https://myaccount.google.com/apppasswords'
      );
    }
    throw error;
  }
};

/**
 * Send a bill as a PDF attachment via email.
 *
 * @param {string} recipientEmail - Customer email
 * @param {Buffer} pdfBuffer - The bill PDF buffer
 * @param {string} billNumber - Bill number for the subject/filename
 * @param {string} shopName - Shop name
 * @returns {Promise<object>}
 */
const sendBillEmail = async (recipientEmail, pdfBuffer, billNumber, shopName) => {
  return sendEmail({
    to: recipientEmail,
    subject: `Your Invoice ${billNumber} from ${shopName}`,
    text: `Dear Customer,\n\nPlease find your invoice ${billNumber} attached.\n\nThank you for shopping at ${shopName}!\n\nRegards,\n${shopName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Invoice from ${shopName}</h2>
        <p>Dear Customer,</p>
        <p>Please find your invoice <strong>${billNumber}</strong> attached to this email.</p>
        <p>Thank you for shopping with us!</p>
        <hr style="border: 1px solid #eee;">
        <p style="color: #666; font-size: 12px;">${shopName} - Computer Generated Invoice</p>
      </div>
    `,
    attachments: [
      {
        filename: `${billNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf',
      },
    ],
  });
};

/**
 * Send password reset OTP verification code email.
 *
 * @param {string} recipientEmail - Recipient user email
 * @param {string} userName - Name of the user
 * @param {string} resetCode - 6-digit OTP code
 * @returns {Promise<object>}
 */
const sendPasswordResetEmail = async (recipientEmail, userName, resetCode) => {
  return sendEmail({
    to: recipientEmail,
    subject: `${resetCode} is your BizGrow Password Reset Code`,
    text: `Hello ${userName || 'User'},\n\nYour password reset verification code for BizGrow is: ${resetCode}\n\nThis code will expire in 10 minutes. If you did not request a password reset, please ignore this email.\n\nRegards,\nBizGrow Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BizGrow Password Verification Code</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%); padding: 30px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: 700; letter-spacing: 1px;">BizGrow</h1>
              <p style="color: #E3F2FD; margin: 6px 0 0 0; font-size: 14px;">Password Reset Verification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 35px 30px;">
              <p style="font-size: 16px; margin-top: 0; color: #2C3E50;">Hello <strong>${userName || 'User'}</strong>,</p>
              <p style="font-size: 14px; color: #555555; line-height: 1.6;">We received a request to reset the password for your BizGrow account. Please use the 6-digit verification code below to authorize this request:</p>
              
              <!-- Code Box -->
              <div style="text-align: center; margin: 30px 0;">
                <div style="display: inline-block; background-color: #F0F4F9; border: 2px dashed #1976D2; border-radius: 10px; padding: 18px 30px;">
                  <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; color: #1976D2; letter-spacing: 10px;">${resetCode}</span>
                </div>
              </div>

              <!-- Important Note -->
              <div style="background-color: #FFF8E1; border-left: 4px solid #FFC107; padding: 12px 16px; border-radius: 4px; margin-bottom: 25px;">
                <p style="margin: 0; font-size: 13px; color: #795548;">⏰ <strong>Security Notice:</strong> This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
              </div>

              <p style="font-size: 13px; color: #777777; line-height: 1.5; margin-bottom: 0;">If you didn't ask to reset your password, you can safely ignore this email. Your password will remain unchanged.</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAFAFA; border-top: 1px solid #EEEEEE; padding: 20px 30px; text-align: center;">
              <p style="font-size: 12px; color: #999999; margin: 0;">© ${new Date().getFullYear()} BizGrow — Business Growth, Billing & Inventory Management. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
};

/**
 * Generate a WhatsApp share link for a bill.
 *
 * @param {string} phone - Customer phone number (10-digit Indian)
 * @param {string} billNumber - Bill number
 * @param {number} grandTotal - Bill total
 * @param {string} shopName - Shop name
 * @returns {string} WhatsApp deep link URL
 */
const generateWhatsAppLink = (phone, billNumber, grandTotal, shopName) => {
  // Prepend India country code if not present
  const fullPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const message = encodeURIComponent(
    `Hi! Here's your invoice from ${shopName}.\n\nBill No: ${billNumber}\nTotal: ₹${grandTotal.toFixed(2)}\n\nThank you for shopping with us!`
  );
  return `https://wa.me/${fullPhone}?text=${message}`;
};

/**
 * Send welcome email to newly registered user.
 *
 * @param {object} params
 * @param {string} params.recipientEmail - Registered user email
 * @param {string} params.userName - Name of the user
 * @param {string} params.shopName - Registered shop name
 * @param {string} [params.gstin] - GSTIN number (optional)
 * @returns {Promise<object>}
 */
const sendWelcomeEmail = async ({ recipientEmail, userName, shopName, gstin }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const loginUrl = `${clientUrl}/login`;

  return sendEmail({
    to: recipientEmail,
    subject: `Welcome to BizGrow, ${userName}! 🚀 Get Started with ${shopName}`,
    text: `Welcome to BizGrow, ${userName}!\n\nThank you for registering your shop "${shopName}" with BizGrow — your all-in-one Business Growth, Billing, and Inventory Management platform.\n\nAccount Summary:\n- Shop Name: ${shopName}\n- Registered Email: ${recipientEmail}\n- GSTIN: ${gstin || 'Not Provided'}\n\nLogin to your dashboard here: ${loginUrl}\n\nQuick Getting Started Steps:\n1. Log in to your BizGrow Dashboard.\n2. Add your inventory items & set stock alerts.\n3. Generate GST-compliant invoices & share them instantly via WhatsApp or Email.\n4. Monitor your sales & business growth with real-time analytics.\n\nIf you need any assistance, feel free to contact our support team.\n\nBest regards,\nBizGrow Team`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to BizGrow</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f6f9; margin: 0; padding: 20px; color: #333;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); padding: 35px 25px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700; letter-spacing: 1px;">🎉 Welcome to BizGrow!</h1>
              <p style="color: #DBEAFE; margin: 8px 0 0 0; font-size: 15px;">Business Growth, Billing & Inventory Management</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 35px 30px;">
              <p style="font-size: 16px; margin-top: 0; color: #1E293B;">Hello <strong>${userName}</strong>,</p>
              <p style="font-size: 14px; color: #475569; line-height: 1.6;">
                Thank you for joining <strong>BizGrow</strong>! We are thrilled to help you grow your shop <strong>"${shopName}"</strong> with our fast POS billing, real-time inventory tracking, and smart business analytics.
              </p>
              
              <!-- Account Details Card -->
              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin: 25px 0;">
                <h3 style="margin-top: 0; margin-bottom: 12px; color: #1E3A8A; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">📋 Account Summary</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 14px; color: #334155;">
                  <tr>
                    <td style="padding: 4px 0; font-weight: 600; width: 120px;">Shop Name:</td>
                    <td style="padding: 4px 0;">${shopName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; font-weight: 600;">Email:</td>
                    <td style="padding: 4px 0;">${recipientEmail}</td>
                  </tr>
                  ${gstin ? `
                  <tr>
                    <td style="padding: 4px 0; font-weight: 600;">GSTIN:</td>
                    <td style="padding: 4px 0;">${gstin}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Login CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${loginUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);">
                  🔑 Login to Your Dashboard
                </a>
              </div>

              <!-- Key Features -->
              <h3 style="color: #1E293B; font-size: 16px; margin-top: 30px; margin-bottom: 15px; border-bottom: 2px solid #F1F5F9; padding-bottom: 8px;">
                🚀 What You Can Do with BizGrow:
              </h3>
              
              <ul style="padding-left: 20px; margin: 0; color: #475569; font-size: 14px; line-height: 1.8;">
                <li><strong>⚡ Lightning Fast Billing:</strong> Create GST-compliant invoices & receipts in seconds.</li>
                <li><strong>📦 Inventory Control:</strong> Monitor stock levels, track suppliers & receive low-stock alerts.</li>
                <li><strong>📲 Instant Sharing:</strong> Send invoices directly to your customers via WhatsApp or Email.</li>
                <li><strong>📊 Business Insights:</strong> View daily sales reports, profit analysis, and revenue graphs.</li>
                <li><strong>👥 Team Management:</strong> Add employees with custom permission controls.</li>
              </ul>

              <!-- Getting Started Box -->
              <div style="background-color: #EFF6FF; border-left: 4px solid #2563EB; padding: 16px 20px; border-radius: 6px; margin-top: 25px;">
                <p style="margin: 0; font-size: 13px; color: #1E40AF; line-height: 1.5;">
                  💡 <strong>Pro Tip:</strong> Bookmark your login link (<a href="${loginUrl}" style="color: #2563EB; text-decoration: underline;">${loginUrl}</a>) for easy access every day!
                </p>
              </div>

              <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-top: 25px; margin-bottom: 0;">
                If you have any questions or need support getting started, reply to this email or reach out to our team anytime.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 20px 30px; text-align: center;">
              <p style="font-size: 12px; color: #64748B; margin: 0;">
                © ${new Date().getFullYear()} BizGrow — Business Growth, Billing & Inventory Management. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  });
};

module.exports = { sendEmail, sendBillEmail, sendPasswordResetEmail, sendWelcomeEmail, generateWhatsAppLink };


