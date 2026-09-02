// Enums and badge mappings mirrored from the backend models. Keeping them in
// one module stops the four copies of each *_VARIANT map from drifting apart.

// Restaurant.approvalStatus — server/models/Restaurant.js
export const STORE_STATUSES = [
  "pending",
  "active",
  "suspended",
  "rejected",
  "expired",
];

export const STORE_STATUS_VARIANT = {
  pending: "warn",
  active: "ok",
  suspended: "danger",
  rejected: "danger",
  expired: "muted",
};

export const STORE_STATUS_LABEL = {
  pending: "Pending Approval",
  active: "Approved",
  suspended: "Suspended",
  rejected: "Rejected",
  expired: "Expired",
};

export const STORE_PLANS = ["trial", "basic", "standard", "premium"];

// SupportTicket — server/models/SupportTicket.js
export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"];
export const TICKET_PRIORITIES = ["low", "medium", "high"];
export const TICKET_CATEGORIES = [
  "billing",
  "technical",
  "account",
  "delivery",
  "other",
];

export const TICKET_STATUS_VARIANT = {
  open: "danger",
  in_progress: "info",
  resolved: "ok",
  closed: "muted",
};

export const TICKET_PRIORITY_VARIANT = {
  low: "muted",
  medium: "warn",
  high: "danger",
};

// DeliveryPartner.status — duty/eligibility, not KYC.
export const PARTNER_STATUSES = ["active", "busy", "inactive", "suspended"];

export const PARTNER_STATUS_VARIANT = {
  active: "ok",
  busy: "warn",
  inactive: "muted",
  suspended: "danger",
};

// DeliveryPartner.verificationStatus — KYC, independent of duty status.
export const PARTNER_VERIFICATION_VARIANT = {
  pending_documents: "muted",
  under_review: "warn",
  approved: "ok",
  rejected: "danger",
  resubmission_required: "warn",
};

export const PARTNER_VERIFICATION_LABEL = {
  pending_documents: "Pending documents",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  resubmission_required: "Resubmission required",
};

export const PAYOUT_STATUS_VARIANT = {
  pending: "warn",
  processing: "info",
  paid: "ok",
};

export const DOCUMENT_STATUS_VARIANT = {
  pending: "warn",
  verified: "ok",
  rejected: "danger",
};

export const VEHICLE_TYPES = [
  { value: "2_wheeler", label: "2 Wheeler" },
  { value: "ev_2_wheeler", label: "EV 2 Wheeler" },
  { value: "non_rto_2_wheeler", label: "Non-RTO 2 Wheeler" },
];

export const ACCOUNT_TYPES = [
  { value: "savings", label: "Savings" },
  { value: "current", label: "Current" },
];

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

// Restaurant document types the admin console reviews.
export const STORE_DOCUMENT_TYPES = [
  { type: "fssai_license", label: "FSSAI License" },
  { type: "business_registration", label: "Business Registration" },
  { type: "gst_certificate", label: "GST Certificate" },
  { type: "pan_card", label: "Identity Proof (PAN)" },
  { type: "address_proof", label: "Address Proof" },
  { type: "bank_statement", label: "Bank Statement" },
];

// DeliveryPartner document types — the `docType` path segment used by
// PATCH /admin/delivery-partners/:id/documents/:docType/verify.
export const PARTNER_DOCUMENT_TYPES = [
  { type: "aadhar_card", label: "Aadhaar Card" },
  { type: "driving_license", label: "Driving License" },
  { type: "vehicle_rc", label: "Vehicle RC" },
  { type: "insurance_document", label: "Insurance Document" },
  { type: "profile_photo", label: "Profile Photo" },
];

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export const MAX_UPLOAD_MB = 5;
