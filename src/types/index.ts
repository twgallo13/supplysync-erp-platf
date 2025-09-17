/**
 * Core type definitions for SupplySync ERP
 * Based on Master Schemas from specification v8.1
 */

// User roles and assignments
export type UserRole = 'SM' | 'DM' | 'FM' | 'COST_ANALYST' | 'ADMIN'

export interface User {
  user_id: string
  full_name: string
  email: string
  role: UserRole
  assignment: {
    type: 'store' | 'district'
    id: string
  }
}

// Order statuses and types
export type OrderStatus = 
  | 'PENDING_DM_APPROVAL'
  | 'PENDING_FM_APPROVAL' 
  | 'APPROVED_FOR_FULFILLMENT'
  | 'IN_TRANSIT'
  | 'PARTIALLY_DELIVERED'
  | 'DELIVERED'
  | 'REJECTED'
  | 'CANCELLED'

export type OrderType = 'STORE_INITIATED' | 'SYSTEM_INITIATED' | 'FM_INITIATED'

export type FulfillmentMethod = 'WAREHOUSE_SHIPMENT' | 'DIRECT_SHIP'

// Audit trail entry
export interface AuditEntry {
  timestamp: string
  user_id: string
  action: string
  reason_code?: string
  details: string
}

// Line item in an order
export interface LineItem {
  product_id: string
  vendor_id: string
  quantity: number
  unit_cost: number
}

// Shipping details
export interface ShippingDetails {
  method: FulfillmentMethod
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
  tracking_numbers: string[]
}

// Order entity
export interface Order {
  order_id: string
  store_id: string
  created_by_user_id: string
  created_at: string
  updated_at: string
  status: OrderStatus
  order_type: OrderType
  line_items: LineItem[]
  shipping_details: ShippingDetails
  total_cost: number
  audit_history: AuditEntry[]
  rejection_reason?: string
  rejection_comment?: string
}

// Vendor information
export interface Vendor {
  vendor_id: string
  vendor_sku: string
  vendor_name: string
  cost_per_item: number
  lead_time_days: number
  is_preferred: boolean
  vendorSkuMap?: {
    sku: string
    barcodeAliases: string[]
  }
}

// Product entity
export interface Product {
  product_id: string
  sku: string
  display_name: string
  description: string
  category: string
  image_s3_key?: string
  pack_quantity: number
  requires_dm_approval: boolean
  is_active: boolean
  tags: string[]
  vendors: Vendor[]
  needGroup?: string
  equivalentUnit?: {
    value: number
    unit: string
  }
  supplyDurationDays?: number
}

// Store entity
export interface Store {
  store_id: string
  store_name: string
  district_id: string
  address: {
    street: string
    city: string
    state: string
    zip: string
  }
}

// Replenishment request
export interface ReplenishmentRequest {
  product_id: string
  store_id: string
  current_quantity: number
  reorder_point: number
  target_quantity: number
  suggested_vendor_id: string
  calculated_cost: number
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

// Enhanced replenishment suggestion for UI
export interface ReplenishmentSuggestion {
  suggestion_id: string
  product_id: string
  store_id: string
  suggested_quantity: number
  reason: 'LOW_STOCK' | 'SEASONAL' | 'PROMOTIONAL' | 'PREDICTIVE'
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  cost_impact: number
  created_at: string
  expires_at: string
  auto_approved: boolean
}

// Allotment request
export interface AllotmentRequest {
  request_id: string
  store_id: string
  product_id: string
  requested_days: number
  current_days: number
  reason_code: string
  comments?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  requested_by: string
  requested_at: string
  reviewed_by?: string
  reviewed_at?: string
}

// Cart item for catalog ordering
export interface CartItem {
  product_id: string
  quantity: number
  selected_vendor_id?: string
}

// Receiving entry
export interface ReceivingEntry {
  receiving_id: string
  order_id: string
  store_id: string
  received_by_user_id: string
  received_at: string
  items: {
    product_id: string
    expected_quantity: number
    received_quantity: number
    condition: 'GOOD' | 'DAMAGED' | 'MISSING'
    notes?: string
  }[]
}

// Analytics KPIs
export interface StoreKPIs {
  store_id: string
  cost_to_serve: number
  sla_percentage: number
  days_of_cover: number
  utilization_index: number
  waste_risk: number
  stockout_risk: number
  forecast_accuracy: number
}

// Search filters for catalog
export interface CatalogFilters {
  category?: string
  search_term?: string
  tags?: string[]
  requires_approval?: boolean
  vendor_id?: string
}

// Reason codes for rejections and overrides
export const REJECTION_REASON_CODES = [
  'OFF_CYCLE_REQUEST',
  'BUDGETARY_CONSTRAINTS', 
  'INVENTORY_SUFFICIENT',
  'INCORRECT_PRODUCT',
  'QUANTITY_EXCESSIVE',
  'VENDOR_UNAVAILABLE',
  'OTHER'
] as const

export type RejectionReasonCode = typeof REJECTION_REASON_CODES[number]

export const OVERRIDE_REASON_CODES = [
  'VENDOR_STOCKOUT',
  'BETTER_PRICING',
  'EXPEDITED_DELIVERY',
  'QUALITY_CONCERN',
  'STRATEGIC_SOURCING',
  'OTHER'
] as const

export type OverrideReasonCode = typeof OVERRIDE_REASON_CODES[number]