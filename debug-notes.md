# Invoice Extraction Debug Notes

## Current State
- 4 attachments in DB (emailIds: 180010, 180009, 180021, 180027)
- 5 invoice extractions exist (emailIds: 180002, 180008, 180010, 180009, 180012)
- Most show N/A for amount, dueDate, products

## Key Issues Found

### Issue 1: MIME type mismatch
- Attachments for emailId 180010 and 180009 have mimeType "application/octet-stream" NOT "application/pdf"
- The extraction code filters: `a.mimeType === "application/pdf" || a.mimeType.startsWith("image/")`
- So these PDFs are SKIPPED because their mimeType is "application/octet-stream"
- Fix: Also match on filename extension (.pdf) when filtering

### Issue 2: Extractions were done BEFORE attachments were downloaded
- emailId 180002, 180008, 180012 have extractions but NO attachments in DB
- These were extracted from email body only (which has no invoice data)
- Need to: delete old extractions, download attachments first, then re-extract

### Issue 3: emailId 180021 and 180027 have attachments but no extraction
- These have proper "application/pdf" mimeType
- They just haven't been extracted yet

## Fix Plan
1. Fix mimeType filter to also check filename for .pdf extension
2. Fix fetchAttachmentsForEmail to detect PDF by filename when MIME is octet-stream
3. Add more logging to extraction to see what's happening
