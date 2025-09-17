/**
 * Mock API service for SupplySync ERP
 * Simulates backend endpoints with realistic data
 */

import { 
  User, 
  Order, 
  Product, 
  Store, 
  ReplenishmentRequest, 
  AllotmentRequest,
  CartItem,
  ReceivingEntry,
  StoreKPIs,
  CatalogFilters,
  OrderStatus,
  RejectionReasonCode,
  OverrideReasonCode
} from '@/types'

// Mock data store
const mockUsers: User[] = [
  {
    user_id: 'usr_sm_001',
    full_name: 'Alice Johnson',
    email: 'alice.johnson@retailchain.com',
    role: 'SM',
    assignment: { type: 'store', id: 's_12345' }
  },
  {
    user_id: 'usr_dm_001', 
    full_name: 'Bob Wilson',
    email: 'bob.wilson@retailchain.com',
    role: 'DM',
    assignment: { type: 'district', id: 'd_67890' }
  },
  {
    user_id: 'usr_fm_001',
    full_name: 'Carol Davis',
    email: 'carol.davis@retailchain.com', 
    role: 'FM',
    assignment: { type: 'district', id: 'd_67890' }
  }
]

const mockStores: Store[] = [
  {
    store_id: 's_12345',
    store_name: 'Main Street Store #12345',
    district_id: 'd_67890',
    address: {
      street: '123 Main St',
      city: 'Anytown',
      state: 'CA',
      zip: '12345'
    }
  },
  {
    store_id: 's_54321',
    store_name: 'Downtown Store #54321', 
    district_id: 'd_67890',
    address: {
      street: '456 Oak Ave',
      city: 'Downtown',
      state: 'CA', 
      zip: '54321'
    }
  }
]

const mockProducts: Product[] = [
  {
    product_id: 'prod_001',
    sku: 'SKU-TP-001',
    display_name: 'Premium Receipt Paper, 3.125" x 230ft',
    description: 'High-quality thermal receipt paper for POS systems. 50 rolls per case.',
    category: 'POS Supplies',
    pack_quantity: 50,
    requires_dm_approval: false,
    is_active: true,
    tags: ['receipt paper', 'pos', 'thermal'],
    vendors: [
      {
        vendor_id: 'ven_001',
        vendor_sku: 'V-TP-3125',
        vendor_name: 'Paper Plus Supply',
        cost_per_item: 24.99,
        lead_time_days: 2,
        is_preferred: true
      },
      {
        vendor_id: 'ven_002', 
        vendor_sku: 'ALT-TP-001',
        vendor_name: 'Office Depot',
        cost_per_item: 28.50,
        lead_time_days: 3,
        is_preferred: false
      }
    ]
  },
  {
    product_id: 'prod_002',
    sku: 'SKU-GC-020',
    display_name: 'Glass Cleaner Spray, 20oz',
    description: 'Professional-grade glass cleaner with ammonia-free formula.',
    category: 'Cleaning Supplies',
    pack_quantity: 12,
    requires_dm_approval: true,
    is_active: true,
    tags: ['glass cleaner', 'cleaning', 'spray'],
    needGroup: 'GLASS_CLEANER',
    equivalentUnit: { value: 20, unit: 'oz' },
    supplyDurationDays: 30,
    vendors: [
      {
        vendor_id: 'ven_003',
        vendor_sku: 'GC-20SP',
        vendor_name: 'CleanCo Industries',
        cost_per_item: 4.25,
        lead_time_days: 5,
        is_preferred: true
      }
    ]
  },
  {
    product_id: 'prod_003',
    sku: 'SKU-HD-001',
    display_name: 'Handheld Barcode Scanner',
    description: 'Zebra DS2208 2D barcode scanner with USB cable.',
    category: 'Hardware',
    pack_quantity: 1,
    requires_dm_approval: true,
    is_active: true,
    tags: ['scanner', 'hardware', 'barcode'],
    vendors: [
      {
        vendor_id: 'ven_004',
        vendor_sku: 'ZEB-DS2208',
        vendor_name: 'Tech Solutions Inc',
        cost_per_item: 165.00,
        lead_time_days: 7,
        is_preferred: true
      }
    ]
  }
]

let mockOrders: Order[] = [
  {
    order_id: 'ord_001',
    store_id: 's_12345',
    created_by_user_id: 'usr_sm_001',
    created_at: '2025-01-15T10:30:00Z',
    updated_at: '2025-01-15T14:20:00Z',
    status: 'PENDING_DM_APPROVAL',
    order_type: 'STORE_INITIATED',
    line_items: [
      {
        product_id: 'prod_002',
        vendor_id: 'ven_003',
        quantity: 2,
        unit_cost: 4.25
      }
    ],
    shipping_details: {
      method: 'WAREHOUSE_SHIPMENT',
      address: mockStores[0].address,
      tracking_numbers: []
    },
    total_cost: 8.50,
    audit_history: [
      {
        timestamp: '2025-01-15T10:30:00Z',
        user_id: 'usr_sm_001',
        action: 'ORDER_CREATED',
        details: 'Order submitted by Store Manager for glass cleaner supplies.'
      }
    ]
  }
]

// API Service Functions
export const apiService = {
  // Authentication
  async getCurrentUser(): Promise<User | null> {
    // Simulate getting current user from token
    return mockUsers[0] // Default to SM for demo
  },

  async login(email: string, password: string): Promise<User> {
    // Simulate login
    const user = mockUsers.find(u => u.email === email)
    if (!user) throw new Error('Invalid credentials')
    return user
  },

  // Products & Catalog
  async getProducts(filters?: CatalogFilters): Promise<Product[]> {
    let products = [...mockProducts]
    
    if (filters?.category) {
      products = products.filter(p => p.category === filters.category)
    }
    if (filters?.search_term) {
      const term = filters.search_term.toLowerCase()
      products = products.filter(p => 
        p.display_name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }
    if (filters?.requires_approval !== undefined) {
      products = products.filter(p => p.requires_dm_approval === filters.requires_approval)
    }
    
    return products
  },

  async getProduct(productId: string): Promise<Product | null> {
    return mockProducts.find(p => p.product_id === productId) || null
  },

  async getCategories(): Promise<string[]> {
    return [...new Set(mockProducts.map(p => p.category))]
  },

  // Orders
  async getOrders(storeId?: string, status?: OrderStatus): Promise<Order[]> {
    let orders = [...mockOrders]
    
    if (storeId) {
      orders = orders.filter(o => o.store_id === storeId)
    }
    if (status) {
      orders = orders.filter(o => o.status === status)
    }
    
    return orders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  },

  async getOrder(orderId: string): Promise<Order | null> {
    return mockOrders.find(o => o.order_id === orderId) || null
  },

  async createOrder(items: CartItem[], storeId: string, userId: string): Promise<Order> {
    const orderId = `ord_${Date.now()}`
    const now = new Date().toISOString()
    
    // Build line items with product/vendor data
    const lineItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.getProduct(item.product_id)
        if (!product) throw new Error(`Product ${item.product_id} not found`)
        
        const vendor = item.selected_vendor_id 
          ? product.vendors.find(v => v.vendor_id === item.selected_vendor_id)
          : product.vendors.find(v => v.is_preferred) || product.vendors[0]
        
        if (!vendor) throw new Error(`No vendor found for product ${item.product_id}`)
        
        return {
          product_id: item.product_id,
          vendor_id: vendor.vendor_id,
          quantity: item.quantity,
          unit_cost: vendor.cost_per_item
        }
      })
    )

    const totalCost = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0)
    const store = mockStores.find(s => s.store_id === storeId)
    if (!store) throw new Error('Store not found')

    // Determine initial status based on whether any items require approval
    const hasRestrictedItems = await Promise.all(
      items.map(async (item) => {
        const product = await this.getProduct(item.product_id)
        return product?.requires_dm_approval || false
      })
    )
    const requiresApproval = hasRestrictedItems.some(Boolean)

    const order: Order = {
      order_id: orderId,
      store_id: storeId,
      created_by_user_id: userId,
      created_at: now,
      updated_at: now,
      status: requiresApproval ? 'PENDING_DM_APPROVAL' : 'PENDING_FM_APPROVAL',
      order_type: 'STORE_INITIATED',
      line_items: lineItems,
      shipping_details: {
        method: 'WAREHOUSE_SHIPMENT',
        address: store.address,
        tracking_numbers: []
      },
      total_cost: totalCost,
      audit_history: [{
        timestamp: now,
        user_id: userId,
        action: 'ORDER_CREATED',
        details: `Order submitted by Store Manager. ${requiresApproval ? 'Requires DM approval due to restricted items.' : 'Sent directly to FM for fulfillment.'}`
      }]
    }

    mockOrders.push(order)
    return order
  },

  async approveOrder(orderId: string, userId: string, userRole: string): Promise<Order> {
    const order = mockOrders.find(o => o.order_id === orderId)
    if (!order) throw new Error('Order not found')
    
    const now = new Date().toISOString()
    
    if (userRole === 'DM' && order.status === 'PENDING_DM_APPROVAL') {
      order.status = 'PENDING_FM_APPROVAL'
      order.updated_at = now
      order.audit_history.push({
        timestamp: now,
        user_id: userId,
        action: 'DM_APPROVED',
        details: 'Approved by District Manager.'
      })
    } else if (userRole === 'FM' && order.status === 'PENDING_FM_APPROVAL') {
      order.status = 'APPROVED_FOR_FULFILLMENT'
      order.updated_at = now
      order.audit_history.push({
        timestamp: now,
        user_id: userId,
        action: 'FM_APPROVED',
        details: 'Approved by Facility Manager for fulfillment.'
      })
    }
    
    return order
  },

  async rejectOrder(orderId: string, userId: string, reasonCode: RejectionReasonCode, comment?: string): Promise<Order> {
    const order = mockOrders.find(o => o.order_id === orderId)
    if (!order) throw new Error('Order not found')
    
    const now = new Date().toISOString()
    order.status = 'REJECTED'
    order.updated_at = now
    order.rejection_reason = reasonCode
    order.rejection_comment = comment
    
    order.audit_history.push({
      timestamp: now,
      user_id: userId,
      action: 'ORDER_REJECTED',
      reason_code: reasonCode,
      details: `Order rejected. ${comment || ''}`
    })
    
    return order
  },

  // Stores
  async getStores(districtId?: string): Promise<Store[]> {
    if (districtId) {
      return mockStores.filter(s => s.district_id === districtId)
    }
    return mockStores
  },

  async getStore(storeId: string): Promise<Store | null> {
    return mockStores.find(s => s.store_id === storeId) || null
  },

  // Replenishment
  async getReplenishmentRequests(storeId?: string): Promise<ReplenishmentRequest[]> {
    // Mock replenishment data
    return [
      {
        product_id: 'prod_001',
        store_id: 's_12345',
        current_quantity: 15,
        reorder_point: 20,
        target_quantity: 50,
        suggested_vendor_id: 'ven_001',
        calculated_cost: 24.99,
        priority: 'HIGH'
      }
    ]
  },

  // Analytics
  async getStoreKPIs(storeId: string): Promise<StoreKPIs> {
    return {
      store_id: storeId,
      cost_to_serve: 2.34,
      sla_percentage: 94.2,
      days_of_cover: 28.5,
      utilization_index: 0.78,
      waste_risk: 0.12,
      stockout_risk: 0.08,
      forecast_accuracy: 0.91
    }
  }
}

export default apiService