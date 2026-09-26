import { db } from './models/index.js';
import { seedInitialOwner } from './routes/auth.js';
import { calculateGstInvoice } from './routes/invoices.js';

export async function seedSampleData() {
  await seedInitialOwner();

  // Seed default business profile
  await db.business.getProfile();

  // Check if customers already exist
  const existingCustomers = await db.customers.count();
  if (existingCustomers === 0) {
    console.log('Seeding initial customers...');
    const c1 = await db.customers.create({
      name: 'Priya Sundaram',
      companyName: 'TechVeda Solutions LLP',
      gstin: '29AABCT1334M1ZV', // Karnataka
      isB2B: true,
      email: 'accounts@techveda.io',
      phone: '+91 98450 88219',
      billingAddress: {
        street: '7th Cross, Koramangala 4th Block',
        city: 'Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560034'
      },
      notes: 'Key enterprise client. NET 15 payment terms.'
    });

    const c2 = await db.customers.create({
      name: 'Aditya Oberoi',
      companyName: 'Zephyr Creative Agency',
      gstin: '07AAACZ1122D1Z4', // Delhi
      isB2B: true,
      email: 'billing@zephyrstudio.in',
      phone: '+91 99100 44552',
      billingAddress: {
        street: 'Plot 14, Okhla Phase III',
        city: 'New Delhi',
        state: 'Delhi',
        stateCode: '07',
        pincode: '110020'
      },
      notes: 'Monthly retainer for branding and visual design.'
    });

    const c3 = await db.customers.create({
      name: 'Vikram Mehta',
      companyName: 'Apex Healthtech Pvt Ltd',
      gstin: '27AAACA9876C1ZQ', // Maharashtra (Intra-state)
      isB2B: true,
      email: 'finance@apexhealth.in',
      phone: '+91 98200 99887',
      billingAddress: {
        street: 'B Wing, Godrej One, Vikhroli East',
        city: 'Mumbai',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '400079'
      },
      notes: 'Healthcare technology client based in Mumbai.'
    });

    await db.customers.create({
      name: 'Siddharth Rao',
      companyName: 'Freelance Design Client',
      gstin: '', // B2C / Unregistered
      isB2B: false,
      email: 'siddharth.rao@gmail.com',
      phone: '+91 97400 33211',
      billingAddress: {
        street: '12th Main, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560038'
      },
      notes: 'Individual freelance contract.'
    });

    // Seed Catalog Items
    console.log('Seeding catalog items...');
    const cat1 = await db.catalog.create({
      name: 'Full-Stack Web & API Architecture',
      description: 'Custom React & Node.js scalable web application development',
      type: 'SERVICES',
      hsnSacCode: '998314', // Information technology software services
      unitPrice: 85000,
      unit: 'NOS',
      defaultGstRate: 18,
      isActive: true
    });

    const cat2 = await db.catalog.create({
      name: 'UI/UX Design & Brand System',
      description: 'End-to-end design tokens, Figma prototypes, design sprints',
      type: 'SERVICES',
      hsnSacCode: '998311', // Management consulting and PR design services
      unitPrice: 45000,
      unit: 'NOS',
      defaultGstRate: 18,
      isActive: true
    });

    const cat3 = await db.catalog.create({
      name: 'Technical Consulting & Code Audit',
      description: 'Security, performance optimization, and architectural review',
      type: 'SERVICES',
      hsnSacCode: '998313', // IT consulting and support services
      unitPrice: 3500,
      unit: 'HRS',
      defaultGstRate: 18,
      isActive: true
    });

    const cat4 = await db.catalog.create({
      name: 'High-Performance Edge Gateway Unit',
      description: 'Industrial grade IoT edge computing hardware controller',
      type: 'GOODS',
      hsnSacCode: '84715000', // Processing units for data processing machines
      unitPrice: 32000,
      unit: 'PCS',
      defaultGstRate: 18,
      isActive: true
    });

    // Seed Sample Invoices
    console.log('Seeding realistic GST invoices...');
    const business = await db.business.getProfile();
    const bState = business.stateCode || '27'; // Maharashtra

    // 1. Intra-state Invoice (Apex Healthtech, Maharashtra: 27 -> CGST 9% + SGST 9%) - Paid
    const inv1Items = [
      {
        catalogItemId: cat1.id,
        name: cat1.name,
        description: 'Sprint 1 & 2 Core Telehealth Portal implementation',
        type: 'SERVICES',
        hsnSac: '998314',
        qty: 1,
        unit: 'NOS',
        unitPrice: 85000,
        discountPercent: 0,
        gstRate: 18
      },
      {
        catalogItemId: cat3.id,
        name: cat3.name,
        description: 'HIPAA & Data Compliance Security Architecture Review',
        type: 'SERVICES',
        hsnSac: '998313',
        qty: 10,
        unit: 'HRS',
        unitPrice: 3500,
        discountPercent: 5,
        gstRate: 18
      }
    ];
    const calc1 = calculateGstInvoice(inv1Items, bState, '27', false);
    await db.invoices.create({
      invoiceNumber: 'INV-2024-089',
      invoiceDate: '2024-08-15',
      dueDate: '2024-08-30',
      customerId: c3.id,
      customerDetails: {
        name: c3.name,
        companyName: c3.companyName,
        gstin: c3.gstin,
        email: c3.email,
        phone: c3.phone,
        address: `${c3.billingAddress.street}, ${c3.billingAddress.city}`,
        state: c3.billingAddress.state,
        stateCode: c3.billingAddress.stateCode,
        pincode: c3.billingAddress.pincode
      },
      placeOfSupply: 'Maharashtra',
      placeOfSupplyStateCode: '27',
      isInterState: calc1.isInterState,
      reverseCharge: false,
      items: calc1.items,
      totalTaxableAmount: calc1.totalTaxableAmount,
      totalCgstAmount: calc1.totalCgstAmount,
      totalSgstAmount: calc1.totalSgstAmount,
      totalIgstAmount: calc1.totalIgstAmount,
      totalTaxAmount: calc1.totalTaxAmount,
      grandTotal: calc1.grandTotal,
      totalInWords: calc1.totalInWords,
      notes: business.defaultNotes,
      termsAndConditions: business.termsAndConditions,
      status: 'Paid',
      paymentDetails: {
        amountPaid: calc1.grandTotal,
        paymentDate: '2024-08-28',
        paymentMethod: 'NEFT / Bank Transfer',
        paymentReference: 'HDFCR20240828004911',
        notes: 'Full payment received in HDFC business account.'
      },
      emailDelivery: {
        sent: true,
        sentAt: '2024-08-15T11:30:00Z',
        recipient: c3.email,
        messageId: 'msg_seeded_089'
      }
    });

    // 2. Inter-state Invoice (TechVeda, Karnataka: 29 -> IGST 18%) - Sent / Pending
    const inv2Items = [
      {
        catalogItemId: cat1.id,
        name: cat1.name,
        description: 'Microservices Backend & Cloud Ingestion Pipeline',
        type: 'SERVICES',
        hsnSac: '998314',
        qty: 1,
        unit: 'NOS',
        unitPrice: 120000,
        discountPercent: 0,
        gstRate: 18
      },
      {
        catalogItemId: cat2.id,
        name: cat2.name,
        description: 'SaaS Design System Components & UI kit',
        type: 'SERVICES',
        hsnSac: '998311',
        qty: 1,
        unit: 'NOS',
        unitPrice: 45000,
        discountPercent: 10,
        gstRate: 18
      }
    ];
    const calc2 = calculateGstInvoice(inv2Items, bState, '29', false);
    await db.invoices.create({
      invoiceNumber: 'INV-2024-090',
      invoiceDate: '2024-09-02',
      dueDate: '2024-09-17',
      customerId: c1.id,
      customerDetails: {
        name: c1.name,
        companyName: c1.companyName,
        gstin: c1.gstin,
        email: c1.email,
        phone: c1.phone,
        address: `${c1.billingAddress.street}, ${c1.billingAddress.city}`,
        state: c1.billingAddress.state,
        stateCode: c1.billingAddress.stateCode,
        pincode: c1.billingAddress.pincode
      },
      placeOfSupply: 'Karnataka',
      placeOfSupplyStateCode: '29',
      isInterState: calc2.isInterState,
      reverseCharge: false,
      items: calc2.items,
      totalTaxableAmount: calc2.totalTaxableAmount,
      totalCgstAmount: calc2.totalCgstAmount,
      totalSgstAmount: calc2.totalSgstAmount,
      totalIgstAmount: calc2.totalIgstAmount,
      totalTaxAmount: calc2.totalTaxAmount,
      grandTotal: calc2.grandTotal,
      totalInWords: calc2.totalInWords,
      notes: business.defaultNotes,
      termsAndConditions: business.termsAndConditions,
      status: 'Sent',
      paymentDetails: {
        amountPaid: 0,
        paymentDate: '',
        paymentMethod: '',
        paymentReference: '',
        notes: ''
      },
      emailDelivery: {
        sent: true,
        sentAt: '2024-09-02T14:15:00Z',
        recipient: c1.email,
        messageId: 'msg_seeded_090'
      }
    });

    // 3. Inter-state Invoice with Goods + Services (Zephyr Creative Agency, Delhi: 07) - Overdue
    const inv3Items = [
      {
        catalogItemId: cat4.id,
        name: cat4.name,
        description: 'Edge Gateway hardware unit for testing studio lab',
        type: 'GOODS',
        hsnSac: '84715000',
        qty: 2,
        unit: 'PCS',
        unitPrice: 32000,
        discountPercent: 0,
        gstRate: 18
      }
    ];
    const calc3 = calculateGstInvoice(inv3Items, bState, '07', false);
    await db.invoices.create({
      invoiceNumber: 'INV-2024-091',
      invoiceDate: '2024-08-01',
      dueDate: '2024-08-16',
      customerId: c2.id,
      customerDetails: {
        name: c2.name,
        companyName: c2.companyName,
        gstin: c2.gstin,
        email: c2.email,
        phone: c2.phone,
        address: `${c2.billingAddress.street}, ${c2.billingAddress.city}`,
        state: c2.billingAddress.state,
        stateCode: c2.billingAddress.stateCode,
        pincode: c2.billingAddress.pincode
      },
      placeOfSupply: 'Delhi',
      placeOfSupplyStateCode: '07',
      isInterState: calc3.isInterState,
      reverseCharge: false,
      items: calc3.items,
      totalTaxableAmount: calc3.totalTaxableAmount,
      totalCgstAmount: calc3.totalCgstAmount,
      totalSgstAmount: calc3.totalSgstAmount,
      totalIgstAmount: calc3.totalIgstAmount,
      totalTaxAmount: calc3.totalTaxAmount,
      grandTotal: calc3.grandTotal,
      totalInWords: calc3.totalInWords,
      notes: 'Hardware units delivered with warranty card included.',
      termsAndConditions: business.termsAndConditions,
      status: 'Overdue',
      paymentDetails: {
        amountPaid: 0,
        paymentDate: '',
        paymentMethod: '',
        paymentReference: '',
        notes: ''
      },
      emailDelivery: {
        sent: true,
        sentAt: '2024-08-01T09:00:00Z',
        recipient: c2.email,
        messageId: 'msg_seeded_091'
      }
    });

    console.log('Sample data seeding complete!');
  }
}
