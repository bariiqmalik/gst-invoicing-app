# BillGST Pro — Indian GST-Compliant Invoicing & Billing Workspace

A comprehensive, production-ready GST invoicing and billing web application tailored for Indian small businesses, agencies, and freelancers. Built with a modern hybrid visual aesthetic combining clean accounting precision with warm freelancer ergonomics.

---

## 🚀 Key Highlights & GST Capabilities

### 1. Core Workspace & Single-Owner Access
- **Protected Workspace:** Single-business owner login gate with secure JWT authentication and self-serve workspace registration.
- **Clean Workspace Registration:** Register your business name, legal entity name, GSTIN, PAN, and credentials to initialize a clean workspace with zero dummy data.
- **Persistent Storage & Clean Serialization:** Database serialization layer cleanly strips raw MongoDB IDs (`_id` and `__v`) from all API responses, returning clean `id` attributes. Supports MongoDB via Mongoose or persistent fallback disk storage in `server/data/`.

### 2. Comprehensive Indian GST Rules & Tax Engine
- **GSTIN Validation:** 15-character regex validation (`^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`), embedded PAN extraction, and validation matching the supplier / buyer state code.
- **HSN & SAC Code Validation:**
  - Goods HSN codes validated for 4, 6, or 8 digits (e.g. `8471`, `84715000`).
  - Services SAC codes validated for 6 digits starting with `99` (e.g. `998311`, `998314`).
- **Dynamic Intra-State vs. Inter-State Tax Calculations:**
  - **Intra-State Supply** (Business State == Place of Supply): Automatically splits GST into **CGST (50%)** and **SGST (50%)**.
  - **Inter-State Supply** (Business State != Place of Supply): Automatically applies full rate as **IGST (100%)**.
  - **37 Official Indian States & UTs** with standard 2-digit GST state codes (e.g., `27` Maharashtra, `07` Delhi, `29` Karnataka, `33` Tamil Nadu).
- **Reverse Charge Mechanism (RCM):** Toggle for buyer tax liability with compliance tagging.
- **Indian Numbering System & Currency Words:** Real-time generation of Indian numbering words (e.g. *"Rupees One Lakh Six Thousand Two Hundred Only"*).

### 3. Invoice Lifecycle, Branded PDFs & Resend Delivery
- **Full Lifecycle:** Draft ➜ Sent ➜ Partial ➜ Paid ➜ Overdue ➜ Cancelled.
- **Branded Tax Invoice PDF Generation:**
  - One-click **Download PDF** button using high-resolution A4 canvas rendering.
  - Official CBIC-compliant layout featuring legal name, trade name, GSTIN, PAN, place of supply, customer details, itemized HSN/SAC lines, discounts, tax splits, terms, bank remittance details, and authorized signatory seal.
  - Mandatory **HSN/SAC Tax Breakup Summary Table** included.
  - **Print Stylesheet:** Custom `@media print` rules for browser printing.
- **Resend Email Integration:**
  - Direct invoice email delivery to customers using Resend API.
  - Interactive email dispatch modal with status reports.
  - Simulation sandbox fallback when no private API key is supplied; live delivery enabled as soon as `RESEND_API_KEY` is saved in Business Settings or `.env`.
- **Payment-State Messaging:**
  - Clear payment status badges and remittance instructions.
  - Static bank NEFT/RTGS details and mock UPI QR code preview in the invoice sheet.
  - **Record Payment Modal:** Log payment date, method, and transaction reference (UTR #) with confetti celebration on full settlement.

---

## 🛠 Project Structure

```
gst-invoicing-app/
├── server/
│   ├── data/                 # File-backed fallback persistent storage
│   ├── models/index.js       # Mongoose schemas & clean JSON serializer (no _id/__v)
│   ├── routes/
│   │   ├── auth.js           # Single owner login & JWT verification
│   │   ├── business.js       # Business settings & GST profile
│   │   ├── catalog.js        # Products & services with HSN/SAC validation
│   │   ├── customers.js      # Customer directory with GSTIN checking
│   │   ├── dashboard.js      # Financial metrics, receivables & trend data
│   │   ├── email.js          # Resend email delivery
│   │   └── invoices.js       # Full GST calculations & invoice management
│   ├── utils/
│   │   └── gstUtils.js       # GSTIN, HSN/SAC regex validators & Indian words converter
│   ├── db.js                 # Unified database adapter & Mongoose connector
│   ├── seedData.js           # Realistic seeded Indian GST data
│   └── index.js              # Express application entry point (Port 5000)
├── src/
│   ├── components/
│   │   ├── Navbar.jsx               # Workspace header & quick-create action
│   │   ├── DashboardView.jsx        # Metrics, 6-month trends, invoice search
│   │   ├── InvoicesView.jsx         # Full invoice lifecycle table & filters
│   │   ├── InvoiceEditorModal.jsx   # GST invoice creator with live calculations
│   │   ├── InvoicePreviewModal.jsx  # Branded A4 GST Tax Invoice & PDF generator
│   │   ├── CustomersView.jsx        # Customer directory management
│   │   ├── CatalogView.jsx          # Goods/Services catalog with HSN/SAC
│   │   ├── BusinessSettingsView.jsx # Legal entity, GSTIN, bank & Resend config
│   │   ├── EmailModal.jsx           # Resend email delivery modal
│   │   ├── PaymentModal.jsx         # Record payments & confetti triggers
│   │   └── LoginModal.jsx           # Single-owner access gate & workspace registration
│   ├── services/
│   │   └── api.js                   # Authenticated API client
│   ├── utils/
│   │   └── gstFrontendUtils.js      # Client-side live calculation engine
│   ├── App.jsx                      # Main routing & state controller
│   └── index.css                    # Professional accounting + warm freelancer design system
├── package.json
└── vite.config.js                   # Vite dev server (Port 3000) with /api proxy
```

---

## 💻 Running Locally

### Development Mode (Concurrent Backend & Frontend)
```bash
npm run dev
```
- Frontend: `http://localhost:3000`
- API Backend: `http://localhost:5000`
