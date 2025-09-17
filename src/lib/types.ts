export type UserRole = 'SM' | 'DM' | 'FM' | 'COST_ANALYST' | 'ADMIN'

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

export interface Product {
  product_id: string
  sku: string
  display_name: string
  description: string
  category: string
  image_url?: string
  pack_quantity: number
  requires_dm_approval: boolean
  is_active: boolean
  tags: string[]
  needGroup?: string
  equivalentUnit?: { value: number; unit: string }
  supplyDurationDays?: number
  vendors: Vendor[]
}

export interface Vendor {
  vendor_id: string
  vendor_sku: string
  cost_per_item: number
  lead_time_days: number
  is_preferred: boolean
  vendorSkuMap?: {
    sku: string
    barcodeAliases?: string[]
  }
}

export interface LineItem {
  product_id: string
  vendor_id: string
  quantity: number
  unit_cost: number
}

export interface AuditEntry {
  timestamp: string
  user_id: string
  action: string
  reason_code?: string
  details: string
}

export interface Order {
  order_id: string
  store_id: string
  created_by_user_id: string
  created_at: string
  updated_at: string
  status: OrderStatus
  order_type: OrderType
  line_items: LineItem[]
  shipping_details: {
    method: 'WAREHOUSE_SHIPMENT' | 'DIRECT_SHIP'
    address: Store['address']
    tracking_numbers: string[]
  }
  total_cost: number
  audit_history: AuditEntry[]
}

export interface CartItem {
  product: Product
  quantity: number
  selected_vendor: Vendor
}