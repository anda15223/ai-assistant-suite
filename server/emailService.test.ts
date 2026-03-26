import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock imapflow
vi.mock("imapflow", () => {
  const mockFetch = vi.fn();
  const mockConnect = vi.fn();
  const mockLogout = vi.fn();
  const mockMailboxOpen = vi.fn();
  const mockGetMailboxLock = vi.fn();

  class MockImapFlow {
    host: string;
    port: number;
    constructor(config: any) {
      this.host = config.host;
      this.port = config.port;
    }
    connect = mockConnect;
    logout = mockLogout;
    mailboxOpen = mockMailboxOpen;
    fetch = mockFetch;
    getMailboxLock = mockGetMailboxLock;
  }

  return {
    ImapFlow: MockImapFlow,
    _mocks: { mockFetch, mockConnect, mockLogout, mockMailboxOpen, mockGetMailboxLock },
  };
});

// Mock nodemailer
vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: "test-123" }),
    })),
  },
}));

import { testConnection, fetchEmails, sendEmail } from "./emailService";
import type { EmailAccount } from "../drizzle/schema";

// Get the mocks
const imapMocks = (await import("imapflow") as any)._mocks;

const mockAccount: EmailAccount = {
  id: 1,
  userId: 1,
  emailAddress: "test@example.com",
  password: "testpass",
  imapHost: "imap.one.com",
  imapPort: 993,
  smtpHost: "send.one.com",
  smtpPort: 465,
  isActive: true,
  lastSyncAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("emailService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("testConnection", () => {
    it("returns true when connection succeeds", async () => {
      imapMocks.mockConnect.mockResolvedValue(undefined);
      imapMocks.mockLogout.mockResolvedValue(undefined);

      const result = await testConnection({
        emailAddress: "test@example.com",
        password: "testpass",
        imapHost: "imap.one.com",
        imapPort: 993,
      });

      expect(result).toBe(true);
      expect(imapMocks.mockConnect).toHaveBeenCalledOnce();
      expect(imapMocks.mockLogout).toHaveBeenCalledOnce();
    });

    it("returns false when connection fails", async () => {
      imapMocks.mockConnect.mockRejectedValue(new Error("Auth failed"));

      const result = await testConnection({
        emailAddress: "test@example.com",
        password: "wrongpass",
        imapHost: "imap.one.com",
        imapPort: 993,
      });

      expect(result).toBe(false);
    });
  });

  describe("fetchEmails", () => {
    it("returns empty array when mailbox is empty", async () => {
      imapMocks.mockConnect.mockResolvedValue(undefined);
      imapMocks.mockMailboxOpen.mockResolvedValue({ exists: 0 });
      imapMocks.mockLogout.mockResolvedValue(undefined);

      const result = await fetchEmails(mockAccount, 20);

      expect(result).toEqual([]);
      expect(imapMocks.mockMailboxOpen).toHaveBeenCalledWith("INBOX");
    });

    it("fetches messages when mailbox has emails", async () => {
      imapMocks.mockConnect.mockResolvedValue(undefined);
      imapMocks.mockMailboxOpen.mockResolvedValue({ exists: 5 });
      imapMocks.mockLogout.mockResolvedValue(undefined);

      // Mock the async iterator for fetch
      const mockMessages = [
        {
          uid: 1,
          seq: 1,
          envelope: {
            messageId: "msg-1@test.com",
            subject: "Test Email",
            from: [{ address: "sender@test.com", name: "Sender" }],
            to: [{ address: "test@example.com" }],
            date: new Date("2026-03-25"),
          },
          source: Buffer.from("From: sender@test.com\r\nSubject: Test\r\n\r\nHello world"),
        },
      ];

      imapMocks.mockFetch.mockImplementation(function* () {
        for (const msg of mockMessages) {
          yield msg;
        }
      });

      const result = await fetchEmails(mockAccount, 20);

      expect(result.length).toBe(1);
      expect(result[0].subject).toBe("Test Email");
      expect(result[0].fromAddress).toBe("sender@test.com");
      expect(result[0].messageId).toBe("msg-1@test.com");
    });

    it("throws error when IMAP connection fails", async () => {
      imapMocks.mockConnect.mockRejectedValue(new Error("Connection refused"));

      await expect(fetchEmails(mockAccount, 20)).rejects.toThrow("Failed to fetch emails");
    });
  });

  describe("sendEmail", () => {
    it("sends email successfully", async () => {
      const result = await sendEmail(
        mockAccount,
        "recipient@test.com",
        "Test Subject",
        "Test body"
      );

      expect(result).toBe(true);
    });
  });
});
