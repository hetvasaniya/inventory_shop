const nodemailer = require('nodemailer');

/**
 * Create a reusable email transporter.
 * Configured via environment variables.
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
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
    console.warn('Email not configured: SMTP_USER or SMTP_PASS missing. Skipping email send.');
    return { accepted: [], rejected: [to], skipped: true };
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: `"H-Mart" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
  };

  if (html) mailOptions.html = html;
  if (attachments) mailOptions.attachments = attachments;

  const info = await transporter.sendMail(mailOptions);
  return info;
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

module.exports = { sendEmail, sendBillEmail, generateWhatsAppLink };
