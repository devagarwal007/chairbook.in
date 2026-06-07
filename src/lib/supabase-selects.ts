export const ATTENDANCE_SESSION_SELECT = `
  id,
  salon_id,
  stylist_id,
  session_date,
  clock_in_at,
  clock_out_at,
  scheduled_start,
  scheduled_end,
  total_worked_minutes,
  total_break_minutes,
  paid_minutes,
  status,
  is_late,
  is_absent,
  admin_note,
  clocked_in_by,
  clocked_out_by,
  created_at,
  updated_at
`;

export const ATTENDANCE_BREAK_SELECT = `
  id,
  session_id,
  salon_id,
  break_start,
  break_end,
  duration_minutes,
  is_paid,
  created_by,
  created_at
`;

export const ATTENDANCE_BLOCK_SELECT = `
  id,
  salon_id,
  stylist_id,
  date_from,
  date_to,
  time_from,
  time_to,
  all_day,
  counts_as,
  reason
`;

export const ATTENDANCE_AUDIT_SELECT = `
  id,
  salon_id,
  session_id,
  edited_by,
  editor_name,
  field_changed,
  old_value,
  new_value,
  reason,
  action_type,
  created_at
`;

export const CORRECTION_REQUEST_SELECT = `
  id,
  salon_id,
  session_id,
  stylist_id,
  reason,
  requested_clock_in,
  requested_clock_out,
  break_corrections,
  status,
  reviewed_by,
  reviewed_at,
  rejection_reason,
  created_at
`;

export const ATTENDANCE_SETTINGS_SELECT = `
  id,
  salon_id,
  is_enabled,
  allow_stylist_clock,
  early_clock_in_minutes,
  late_threshold_minutes,
  allow_admin_edit,
  require_edit_reason,
  allow_correction_request,
  enable_break_tracking
`;

export const GST_SETTINGS_SELECT = `
  id,
  salon_id,
  gst_enabled,
  gstin,
  legal_name,
  registered_address,
  state,
  state_code,
  gst_rate,
  sac_code,
  pricing_mode,
  invoice_prefix
`;

export const GST_INVOICE_SELECT = `
  id,
  salon_id,
  booking_id,
  payment_id,
  invoice_number,
  invoice_date,
  financial_year,
  share_token,
  salon_legal_name,
  salon_gstin,
  salon_address,
  salon_state,
  salon_state_code,
  customer_name,
  customer_phone,
  customer_gstin,
  customer_business_name,
  customer_billing_address,
  customer_billing_state,
  customer_billing_state_code,
  is_igst,
  sac_code,
  taxable_amount,
  cgst_rate,
  cgst_amount,
  sgst_rate,
  sgst_amount,
  igst_rate,
  igst_amount,
  discount_amount,
  total_amount,
  payment_method,
  whatsapp_delivery_status,
  created_at
`;

export const NOTIFICATION_SELECT = "id, type, title, body, meta, read, created_at";

export const PUBLIC_SALON_SELECT = "id, name, slug, area, city, type, hours, booking_window_days";
