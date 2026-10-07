import express from 'express';
import { db } from '../models/index.js';
import { authenticateToken } from './auth.js';
import { dispatchCentralizedInvoiceEmail, emailQueue } from '../services/emailService.js';

const router = express.Router();

// GET /api/email/queue-status (Queue Telemetry & Metrics for Centralized SaaS)
router.get('/queue-status', authenticateToken, async (req, res) => {
  try {
    const queueMetrics = emailQueue.getMetrics();
    res.json({
      success: true,
      service: 'Centralized Master Email Service',
      queue: queueMetrics,
      masterKeyConfigured: !!(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.startsWith('re_')),
      platformSender: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/invoices/:id/send-email (Centralized SaaS Dispatch with Dynamic Reply-To)
router.post('/:id/send-email', authenticateToken, async (req, res) => {
  try {
    const invoice = await (req.db ? req.db.invoices.findById(req.params.id) : db.invoices.findById(req.params.id, req.workspace_id));
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const business = await (req.db ? req.db.business.getProfile() : db.business.getProfile(req.workspace_id));
    const recipientEmail = req.body.email || invoice.customerDetails?.email;

    if (!recipientEmail) {
      return res.status(400).json({ 
        success: false, 
        message: 'No recipient email address provided or found on customer record.' 
      });
    }

    // Dispatch through Centralized High-Volume Queue with Dynamic Reply-To
    const result = await dispatchCentralizedInvoiceEmail(invoice, business, recipientEmail);

    // Update invoice record with email delivery status
    const updatePayload = {
      status: invoice.status === 'Draft' ? 'Sent' : invoice.status,
      emailDelivery: {
        sent: true,
        sentAt: new Date().toISOString(),
        recipient: recipientEmail,
        messageId: result.messageId,
        replyTo: result.replyTo,
        dispatchedFrom: result.from
      }
    };
    const updatedInvoice = await (req.db ? req.db.invoices.update(invoice.id, updatePayload) : db.invoices.update(invoice.id, updatePayload, req.workspace_id));

    const isLive = result.isLiveResend;
    const feedbackMessage = isLive 
      ? `Invoice delivered to ${recipientEmail} via BillGST Central SaaS Mailer. Customer replies will route directly to ${result.replyTo}.`
      : `Invoice queued & dispatched to ${recipientEmail} (Master Platform Sandbox). Customer replies configured to route to ${result.replyTo}.`;

    res.json({
      success: true,
      isLiveResend: isLive,
      message: feedbackMessage,
      delivery: {
        recipient: recipientEmail,
        replyTo: result.replyTo,
        from: result.from,
        sentAt: new Date().toISOString(),
        messageId: result.messageId
      },
      invoice: updatedInvoice
    });
  } catch (err) {
    console.error('Email Dispatch Error:', err);
    res.status(500).json({ 
      success: false, 
      message: `Email dispatch failed: ${err.message}` 
    });
  }
});

export default router;
