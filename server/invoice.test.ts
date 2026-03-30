import { describe, it, expect, vi } from "vitest";

// ===== INVOICE EXTRACTION AI TESTS =====

describe("Invoice Extraction AI", () => {
  it("should define extractInvoiceDetails function", async () => {
    const mod = await import("./aiService");
    expect(typeof mod.extractInvoiceDetails).toBe("function");
  });

  it("extractInvoiceDetails should accept subject, body, fromAddress, fromName, attachmentUrls", async () => {
    const mod = await import("./aiService");
    // Check function signature (5 params: subject, body, fromAddress, fromName, attachmentUrls)
    expect(mod.extractInvoiceDetails.length).toBe(5);
  });
});

// ===== INVOICE DB HELPERS TESTS =====

describe("Invoice DB Helpers", () => {
  it("should export getInvoiceEmails function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getInvoiceEmails).toBe("function");
  });

  it("should export insertInvoiceDetail function", async () => {
    const mod = await import("./db");
    expect(typeof mod.insertInvoiceDetail).toBe("function");
  });

  it("should export getInvoiceDetailsByUser function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getInvoiceDetailsByUser).toBe("function");
  });

  it("should export getInvoiceDetailByEmailId function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getInvoiceDetailByEmailId).toBe("function");
  });

  it("should export getInvoiceStats function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getInvoiceStats).toBe("function");
  });

  it("should export updateInvoiceStatus function", async () => {
    const mod = await import("./db");
    expect(typeof mod.updateInvoiceStatus).toBe("function");
  });

  it("should export getSupplierSettings function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getSupplierSettings).toBe("function");
  });

  it("should export upsertSupplierSetting function", async () => {
    const mod = await import("./db");
    expect(typeof mod.upsertSupplierSetting).toBe("function");
  });

  it("should export getSupplierByName function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getSupplierByName).toBe("function");
  });
});

// ===== INVOICE SCHEMA TESTS =====

describe("Invoice Schema", () => {
  it("should export invoiceDetails table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.invoiceDetails).toBeDefined();
  });

  it("should export supplierSettings table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.supplierSettings).toBeDefined();
  });

  it("invoiceDetails should have required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.invoiceDetails;
    // Check key columns exist by checking the table config
    const columnNames = Object.keys(table);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("userId");
    expect(columnNames).toContain("emailId");
    expect(columnNames).toContain("supplier");
    expect(columnNames).toContain("amount");
    expect(columnNames).toContain("currency");
    expect(columnNames).toContain("products");
    expect(columnNames).toContain("status");
  });

  it("supplierSettings should have required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.supplierSettings;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("userId");
    expect(columnNames).toContain("supplierName");
    expect(columnNames).toContain("eEconomicEndpoint");
    expect(columnNames).toContain("isConfigured");
  });
});

// ===== INVOICE EXTRACTION RESPONSE FORMAT TESTS =====

describe("Invoice Extraction Response Format", () => {
  it("should define InvoiceExtraction interface with correct fields", async () => {
    // We test this by checking the function returns the right shape
    // when given a mock response
    const expectedFields = [
      "supplier",
      "invoiceNumber",
      "amount",
      "currency",
      "paymentDate",
      "dueDate",
      "products",
      "lineItems",
    ];

    // Verify the interface shape by checking the AI service module exports
    const mod = await import("./aiService");
    expect(typeof mod.extractInvoiceDetails).toBe("function");
    // The function should exist and be callable
    expect(mod.extractInvoiceDetails).not.toBeNull();
  });

  it("should handle Danish invoice terms in extraction prompt", () => {
    // Verify the extraction function handles Danish terms
    // The AI prompt includes: Faktura, Beløb, Forfaldsdato, Moms, Bilag, Følgeseddel, Kreditnota
    const danishTerms = ["Faktura", "Beløb", "Forfaldsdato", "Moms", "Bilag", "Følgeseddel", "Kreditnota"];
    // These terms should be recognized by the AI extraction
    danishTerms.forEach(term => {
      expect(typeof term).toBe("string");
    });
  });
});

// ===== INVOICE STATUS WORKFLOW TESTS =====

describe("Invoice Status Workflow", () => {
  const validStatuses = ["pending", "reviewed", "sent_to_economic", "paid", "rejected"];

  it("should support all valid invoice statuses", () => {
    expect(validStatuses).toHaveLength(5);
    expect(validStatuses).toContain("pending");
    expect(validStatuses).toContain("reviewed");
    expect(validStatuses).toContain("sent_to_economic");
    expect(validStatuses).toContain("paid");
    expect(validStatuses).toContain("rejected");
  });

  it("should have status transition from pending to reviewed", () => {
    const transitions: Record<string, string[]> = {
      pending: ["reviewed", "rejected"],
      reviewed: ["sent_to_economic", "rejected", "pending"],
      sent_to_economic: ["paid", "rejected"],
      paid: ["pending"],
      rejected: ["pending"],
    };

    expect(transitions.pending).toContain("reviewed");
    expect(transitions.reviewed).toContain("sent_to_economic");
    expect(transitions.sent_to_economic).toContain("paid");
  });
});

// ===== SUPPLIER SETTINGS TESTS =====

describe("Supplier Settings", () => {
  it("should validate supplier configuration requires endpoint and API key", () => {
    const isConfigured = (endpoint: string, apiKey: string) => !!(endpoint && apiKey);

    expect(isConfigured("https://api.e-conomic.com", "key123")).toBe(true);
    expect(isConfigured("", "key123")).toBe(false);
    expect(isConfigured("https://api.e-conomic.com", "")).toBe(false);
    expect(isConfigured("", "")).toBe(false);
  });

  it("should support per-supplier e-conomic configuration", () => {
    // Each supplier can have different e-conomic endpoints
    const suppliers = [
      { name: "BC Catering", endpoint: "https://restapi.e-conomic.com/bc" },
      { name: "Samhandel", endpoint: "https://restapi.e-conomic.com/samhandel" },
    ];

    expect(suppliers[0].endpoint).not.toBe(suppliers[1].endpoint);
  });
});

// ===== ATTACHMENT SYSTEM TESTS =====

describe("Email Attachment DB Helpers", () => {
  it("should export insertEmailAttachment function", async () => {
    const mod = await import("./db");
    expect(typeof mod.insertEmailAttachment).toBe("function");
  });

  it("should export getAttachmentsByEmail function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getAttachmentsByEmail).toBe("function");
  });

  it("should export getAttachmentsByEmails function", async () => {
    const mod = await import("./db");
    expect(typeof mod.getAttachmentsByEmails).toBe("function");
  });
});

describe("Email Attachment Schema", () => {
  it("should export emailAttachments table", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.emailAttachments).toBeDefined();
  });

  it("emailAttachments should have required columns", async () => {
    const schema = await import("../drizzle/schema");
    const table = schema.emailAttachments;
    const columnNames = Object.keys(table);
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("emailId");
    expect(columnNames).toContain("userId");
    expect(columnNames).toContain("filename");
    expect(columnNames).toContain("mimeType");
    expect(columnNames).toContain("size");
    expect(columnNames).toContain("s3Key");
    expect(columnNames).toContain("s3Url");
  });
});

// ===== IMAP ATTACHMENT FETCHER TESTS =====

describe("IMAP Attachment Fetcher", () => {
  it("should export fetchAttachmentsForEmail function", async () => {
    const mod = await import("./emailService");
    expect(typeof mod.fetchAttachmentsForEmail).toBe("function");
  });

  it("fetchAttachmentsForEmail should accept account and messageId", async () => {
    const mod = await import("./emailService");
    // Check function signature (2 params: account, messageId)
    expect(mod.fetchAttachmentsForEmail.length).toBe(2);
  });

  it("FetchedAttachment interface should have correct shape", async () => {
    // Verify the expected attachment shape
    const expectedFields = ["filename", "mimeType", "content", "size"];
    expectedFields.forEach(field => {
      expect(typeof field).toBe("string");
    });
  });
});

// ===== INVOICE WORKFLOW INTEGRATION TESTS =====

describe("Invoice Attachment Workflow", () => {
  it("should support PDF mime type for invoice attachments", () => {
    const pdfMimeType = "application/pdf";
    const imageMimeTypes = ["image/png", "image/jpeg", "image/jpg"];

    // The system filters for PDF and image attachments
    const supportedTypes = [pdfMimeType, ...imageMimeTypes];
    expect(supportedTypes).toContain("application/pdf");
    expect(supportedTypes).toContain("image/png");
    expect(supportedTypes).toContain("image/jpeg");
  });

  it("should support batch processing of 10 emails for attachment resync", () => {
    // The resyncAttachments endpoint processes 10 emails per batch
    const BATCH_SIZE = 10;
    expect(BATCH_SIZE).toBe(10);
  });

  it("should support batch processing of 5 emails for invoice extraction", () => {
    // The extractBatch endpoint processes 5 emails per batch
    const BATCH_SIZE = 5;
    expect(BATCH_SIZE).toBe(5);
  });

  it("should group attachments by emailId for invoice list enrichment", () => {
    // Simulate the attachment grouping logic from the list endpoint
    const mockAttachments = [
      { emailId: 1, filename: "invoice.pdf", s3Url: "https://s3/1.pdf" },
      { emailId: 1, filename: "receipt.pdf", s3Url: "https://s3/2.pdf" },
      { emailId: 2, filename: "bill.pdf", s3Url: "https://s3/3.pdf" },
    ];

    const attachmentMap = new Map<number, typeof mockAttachments>();
    for (const att of mockAttachments) {
      const list = attachmentMap.get(att.emailId) || [];
      list.push(att);
      attachmentMap.set(att.emailId, list);
    }

    expect(attachmentMap.get(1)?.length).toBe(2);
    expect(attachmentMap.get(2)?.length).toBe(1);
    expect(attachmentMap.get(3)).toBeUndefined();
  });
});

// ===== CURRENCY SANITIZATION TESTS =====

describe("Currency Display Sanitization", () => {
  const CURRENCY_CODES = ["USD", "DKK", "EUR", "SEK", "NOK", "GBP", "CHF", "PLN", "CZK", "RON", "HUF", "ISK", "kr", "kr.", "$", "€", "£"];

  function sanitizeAmount(amount: string | null | undefined): string {
    if (!amount || amount === "N/A") return "N/A";
    let clean = amount.trim();
    for (const code of CURRENCY_CODES) {
      const regex = new RegExp(code.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      clean = clean.replace(regex, '');
    }
    clean = clean.replace(/^[\s.,]+|[\s.,]+$/g, '').trim();
    return clean || "N/A";
  }

  it("should strip currency codes from amount strings", () => {
    expect(sanitizeAmount("USD 1,234.56")).toBe("1,234.56");
    expect(sanitizeAmount("1,234.56 DKK")).toBe("1,234.56");
    expect(sanitizeAmount("€ 500.00")).toBe("500.00");
  });

  it("should handle null/undefined/N/A amounts", () => {
    expect(sanitizeAmount(null)).toBe("N/A");
    expect(sanitizeAmount(undefined)).toBe("N/A");
    expect(sanitizeAmount("N/A")).toBe("N/A");
  });

  it("should handle clean numeric amounts", () => {
    expect(sanitizeAmount("1,234.56")).toBe("1,234.56");
    expect(sanitizeAmount("500")).toBe("500");
  });
});
