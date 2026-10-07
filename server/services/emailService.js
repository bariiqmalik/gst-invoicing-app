import { Resend } from 'resend';
import dotenv from 'dotenv';
import { formatINR } from '../utils/gstUtils.js';

dotenv.config();

// Master platform configuration from environment variables
const MASTER_RESEND_KEY = process.env.RESEND_API_KEY || '';
const PLATFORM_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'invoices@billgst.pro';
const FALLBACK_TEST_SENDER = 'onboarding@resend.dev'; // Resend's default unverified domain fallback

let resendClient = null;
if (MASTER_RESEND_KEY) {
  try {
    resendClient = new Resend(MASTER_RESEND_KEY);
    console.log('✓ Master Resend Email Client initialized with central SaaS credentials');
  } catch (err) {
    console.error('Failed to initialize Master Resend client:', err.message);
  }
} else {
  console.log('Notice: RESEND_API_KEY not configured in .env. Platform operating in high-volume queue simulation mode.');
}

/**
 * High-Scale Priority Email Queue with Concurrency & Rate-Limiting Controls
 */
class HighVolumeEmailQueue {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 5; // Max concurrent outgoing API calls
    this.rateLimitPerSecond = options.rateLimitPerSecond || 10; // Resend burst safety
    this.maxRetries = options.maxRetries || 3;
    this.queue = [];
    this.activeWorkers = 0;
    this.lastDispatchedTime = 0;
    this.metrics = {
      totalQueued: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalRetried: 0
    };
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: 'job_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        task,
        retries: 0,
        queuedAt: Date.now(),
        resolve,
        reject
      });
      this.metrics.totalQueued++;
      this.processNext();
    });
  }

  async processNext() {
    if (this.queue.length === 0 || this.activeWorkers >= this.concurrency) {
      return;
    }

    // Rate limiter throttle check
    const now = Date.now();
    const minInterval = 1000 / this.rateLimitPerSecond;
    const timeSinceLast = now - this.lastDispatchedTime;
    if (timeSinceLast < minInterval) {
      setTimeout(() => this.processNext(), minInterval - timeSinceLast);
      return;
    }

    const job = this.queue.shift();
    if (!job) return;

    this.activeWorkers++;
    this.lastDispatchedTime = Date.now();

    try {
      const result = await job.task();
      this.metrics.totalDelivered++;
      job.resolve(result);
    } catch (err) {
      const isRateLimit = err.status === 429 || err.message?.includes('rate limit');
      if (job.retries < this.maxRetries) {
        job.retries++;
        this.metrics.totalRetried++;
        const backoffDelay = isRateLimit ? 2000 * Math.pow(2, job.retries) : 1000 * job.retries;
        console.warn(`[Email Queue] Job ${job.id} retry ${job.retries}/${this.maxRetries} in ${backoffDelay}ms: ${err.message}`);
        setTimeout(() => {
          this.queue.unshift(job);
          this.processNext();
        }, backoffDelay);
      } else {
        this.metrics.totalFailed++;
        job.reject(err);
      }
    } finally {
      this.activeWorkers--;
      this.processNext();
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      pendingInQueue: this.queue.length,
      activeWorkers: this.activeWorkers
    };
  }
}

export const emailQueue = new HighVolumeEmailQueue();

/**
 * Generate clean HTML email template for the invoice
 */
export function generateInvoiceEmailHtml(invoice, business) {
  const isInterState = invoice.isInterState;
  const itemsRows = (invoice.items || []).map((it, idx) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-size: 14px;">
      <td style="padding: 10px 8px; color: #475569;">${idx + 1}</td>
      <td style="padding: 10px 8px; font-weight: 500; color: #1e293b;">
        ${it.name}
        <div style="font-size: 12px; color: #64748b;">HSN/SAC: ${it.hsnSac}</div>
      </td>
      <td style="padding: 10px 8px; text-align: center; color: #475569;">${it.qty} ${it.unit}</td>
      <td style="padding: 10px 8px; text-align: right; color: #475569;">${formatINR(it.unitPrice)}</td>
      <td style="padding: 10px 8px; text-align: right; font-weight: 600; color: #1e293b;">${formatINR(it.totalAmount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Tax Invoice ${invoice.invoiceNumber}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        
        <!-- Header Banner -->
        <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 32px; color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${business.legalName}</h1>
              <p style="margin: 0; font-size: 13px; color: #94a3b8;">GSTIN: <span style="color: #f8fafc; font-weight: 600;">${business.gstin || 'Unregistered'}</span></p>
            </div>
            <div style="text-align: right;">
              <span style="display: inline-block; background: #f59e0b; color: #ffffff; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-transform: uppercase;">TAX INVOICE</span>
              <p style="margin: 6px 0 0 0; font-size: 14px; font-weight: 600; color: #f8fafc;">#${invoice.invoiceNumber}</p>
            </div>
          </div>
        </div>

        <!-- Body Details -->
        <div style="padding: 32px;">
          <p style="font-size: 15px; margin: 0 0 20px 0;">Dear <strong>${invoice.customerDetails.name}</strong>,</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 24px 0;">
            Please find your GST tax invoice from <strong>${business.legalName}</strong>. Details of the billing are summarized below:
          </p>

          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; border: 1px solid #edf2f7; display: flex; justify-content: space-between;">
            <div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Invoice Date</div>
              <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${invoice.invoiceDate}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Payment Due</div>
              <div style="font-size: 14px; font-weight: 600; margin-top: 4px; color: #dc2626;">${invoice.dueDate}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Place of Supply</div>
              <div style="font-size: 14px; font-weight: 600; margin-top: 4px;">${invoice.placeOfSupply} (${invoice.placeOfSupplyStateCode})</div>
            </div>
          </div>

          <!-- Items Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <thead>
              <tr style="background: #f1f5f9; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase;">
                <th style="padding: 8px;">#</th>
                <th style="padding: 8px;">Description</th>
                <th style="padding: 8px; text-align: center;">Qty</th>
                <th style="padding: 8px; text-align: right;">Rate</th>
                <th style="padding: 8px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- Financial Summary -->
          <div style="margin-left: auto; width: 280px; margin-bottom: 24px;">
            <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569;">
              <span>Taxable Value:</span>
              <span>${formatINR(invoice.totalTaxableAmount)}</span>
            </div>
            ${isInterState ? `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569;">
                <span>IGST:</span>
                <span>${formatINR(invoice.totalIgstAmount)}</span>
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569;">
                <span>CGST:</span>
                <span>${formatINR(invoice.totalCgstAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; padding: 6px 0; font-size: 14px; color: #475569;">
                <span>SGST:</span>
                <span>${formatINR(invoice.totalSgstAmount)}</span>
              </div>
            `}
            <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 16px; font-weight: 700; color: #0f172a; border-top: 2px solid #e2e8f0; margin-top: 6px;">
              <span>Total Payable:</span>
              <span style="color: #059669;">${formatINR(invoice.grandTotal)}</span>
            </div>
          </div>

          <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 6px; font-size: 13px; color: #334155; margin-bottom: 24px;">
            <strong>Amount in Words:</strong> ${invoice.totalInWords}
          </div>

          <!-- Bank Transfer Details -->
          <div style="border-top: 1px dashed #cbd5e1; padding-top: 20px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px; color: #0f172a; text-transform: uppercase;">Bank Transfer Details</h4>
            <div style="font-size: 13px; color: #475569; line-height: 1.6;">
              <strong>Bank:</strong> ${business.bankDetails?.bankName || 'N/A'}<br>
              <strong>Account Holder:</strong> ${business.bankDetails?.accountHolder || business.legalName}<br>
              <strong>A/C No:</strong> ${business.bankDetails?.accountNumber || 'N/A'}<br>
              <strong>IFSC:</strong> ${business.bankDetails?.ifscCode || 'N/A'}<br>
              ${business.bankDetails?.upiId ? `<strong>UPI ID:</strong> ${business.bankDetails.upiId}` : ''}
            </div>
          </div>

          <!-- Footer with Direct Business Contact -->
          <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; text-align: center;">
            This invoice was generated and delivered on behalf of <strong>${business.legalName}</strong>.<br />
            To contact the business owner, reply directly to this email or write to <a href="mailto:${business.email}" style="color: #2563eb;">${business.email}</a>.
          </div>

        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Dispatch invoice via Centralized SaaS Platform
 * Dynamic Sender, Dynamic Reply-To to business owner, High-Volume Queuing
 */
export async function dispatchCentralizedInvoiceEmail(invoice, business, recipientEmail) {
  return emailQueue.enqueue(async () => {
    // 1. Centralized Platform Sender Domain
    // Default to verified domain or onboarding address
    let fromSender = process.env.RESEND_FROM_EMAIL || PLATFORM_FROM_EMAIL;
    
    // In Resend free sandbox without verified custom domain, sender must be onboarding@resend.dev
    // If master key starts with re_ and custom domain isn't verified yet, fallback smoothly
    if (fromSender === 'invoices@billgst.pro' && (!process.env.RESEND_DOMAIN_VERIFIED || process.env.RESEND_DOMAIN_VERIFIED === 'false')) {
      fromSender = FALLBACK_TEST_SENDER;
    }

    // Display formatted sender: "Business Name via BillGST Pro <platform@domain>"
    const senderDisplay = `"${business.legalName || 'Business'} via BillGST Pro" <${fromSender}>`;

    // 2. Dynamic Reply-To directly to the Business Owner
    const replyToEmail = business.email || 'billing@invoicing.local';

    // 3. Subject and HTML
    const emailSubject = `Tax Invoice #${invoice.invoiceNumber} from ${business.legalName || 'Business'}`;
    const emailHtml = generateInvoiceEmailHtml(invoice, business);

    const masterKey = process.env.RESEND_API_KEY || MASTER_RESEND_KEY;

    let messageId = 'simulated_' + Date.now();
    let isLiveResend = false;

    if (masterKey && masterKey.startsWith('re_')) {
      const client = resendClient || new Resend(masterKey);
      
      const sendPayload = {
        from: senderDisplay,
        to: recipientEmail,
        reply_to: replyToEmail,
        subject: emailSubject,
        html: emailHtml
      };

      try {
        const response = await client.emails.send(sendPayload);
        if (response.error) {
          throw new Error(response.error.message || 'Resend transmission error');
        }
        messageId = response.data?.id || response.id || ('resend_' + Date.now());
        isLiveResend = true;
        console.log(`[Master SaaS Email] Invoice #${invoice.invoiceNumber} transmitted live to ${recipientEmail} (Msg ID: ${messageId}) Reply-To: ${replyToEmail}`);
      } catch (sendErr) {
        console.error('[Master SaaS Email Error]:', sendErr.message);
        throw sendErr;
      }
    } else {
      console.log(`[Master SaaS Email Simulation] Queued & simulated dispatch of invoice #${invoice.invoiceNumber} to ${recipientEmail} from ${senderDisplay} (Reply-To: ${replyToEmail})`);
    }

    return {
      success: true,
      isLiveResend,
      messageId,
      recipient: recipientEmail,
      replyTo: replyToEmail,
      from: senderDisplay
    };
  });
}
