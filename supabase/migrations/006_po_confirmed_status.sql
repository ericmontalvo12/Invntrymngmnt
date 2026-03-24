-- Add 'confirmed' status to po_status enum
-- Flow: draft → ordered (Open) → confirmed (Ordered) → partially_received → received
alter type po_status add value 'confirmed' after 'ordered';
