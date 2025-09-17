import { Product, Order, User, Store } from './types'

export const mockUsers: User[] = [
  {
    user_id: 'usr_sm_001',
    full_name: 'Sarah Chen',
    email: 'sarah.chen@retailcorp.com',
    role: 'SM',
    assignment: { type: 'store', id: 's_12345' }
  },
  {
    user_id: 'usr_dm_001',
    full_name: 'Marcus Rodriguez',
    email: 'marcus.rodriguez@retailcorp.com',
    role: 'DM',
    assignment: { type: 'district', id: 'd_67890' }
  },
  {
    user_id: 'usr_fm_001',
    full_name: 'Jennifer Walsh',
    email: 'jennifer.walsh@retailcorp.com',
    role: 'FM',
    assignment: { type: 'district', id: 'd_67890' }
  }
]

export const mockStores: Store[] = [
  {
    store_id: 's_12345',
    store_name: 'Downtown Plaza #12345',
    district_id: 'd_67890',
    address: {
      street: '123 Main Street',
      city: 'Metropolitan City',
      state: 'CA',
      zip: '90210'
    }
  },
  {
    store_id: 's_12346',
    store_name: 'Westfield Mall #12346',
    district_id: 'd_67890',
    address: {
      street: '456 Shopping Blvd',
      city: 'Metropolitan City',
      state: 'CA',
      zip: '90211'
    }
  }
]

export const mockProducts: Product[] = [
  {
    product_id: 'prod_paper_001',
    sku: 'SKU-PP-8511',
    display_name: '8.5x11 Copy Paper, Case',
    description: 'Standard 20lb copy paper, 5000 sheets per case. Bright white, laser/inkjet compatible.',
    category: 'Office Supplies',
    pack_quantity: 5000,
    requires_dm_approval: false,
    is_active: true,
    tags: ['paper', 'printing', 'office'],
    vendors: [
      {
        vendor_id: 'ven_staples',
        vendor_sku: 'ST-CP8511',
        cost_per_item: 24.99,
        lead_time_days: 2,
        is_preferred: true
      },
      {
        vendor_id: 'ven_costco',
        vendor_sku: 'CC-PAPER-001',
        cost_per_item: 22.50,
        lead_time_days: 3,
        is_preferred: false
      }
    ]
  },
  {
    product_id: 'prod_cleaner_001',
    sku: 'SKU-GC-20OZ',
    display_name: 'Glass Cleaner, 20oz Spray',
    description: 'Professional glass cleaner with ammonia-free formula. Streak-free cleaning for windows and displays.',
    category: 'Cleaning Supplies',
    pack_quantity: 1,
    requires_dm_approval: false,
    is_active: true,
    tags: ['cleaning', 'glass', 'spray'],
    vendors: [
      {
        vendor_id: 'ven_sysco',
        vendor_sku: 'SYS-GC20',
        cost_per_item: 4.75,
        lead_time_days: 1,
        is_preferred: true
      }
    ]
  },
  {
    product_id: 'prod_receipt_001',
    sku: 'SKU-RP-THERM',
    display_name: 'Thermal Receipt Paper, 12-Pack',
    description: 'High-quality thermal paper rolls for POS systems. BPA-free, 3.125" x 230" rolls.',
    category: 'POS Supplies',
    pack_quantity: 12,
    requires_dm_approval: true,
    is_active: true,
    tags: ['receipt', 'pos', 'thermal', 'restricted'],
    vendors: [
      {
        vendor_id: 'ven_posmate',
        vendor_sku: 'PM-THERM-12',
        cost_per_item: 38.99,
        lead_time_days: 2,
        is_preferred: true
      }
    ]
  },
  {
    product_id: 'prod_bags_001',
    sku: 'SKU-BAG-PLAST',
    display_name: 'Shopping Bags, Plastic (1000ct)',
    description: 'Durable plastic shopping bags with handles. Medium size, suitable for most retail items.',
    category: 'Store Supplies',
    pack_quantity: 1000,
    requires_dm_approval: false,
    is_active: true,
    tags: ['bags', 'plastic', 'shopping'],
    vendors: [
      {
        vendor_id: 'ven_uline',
        vendor_sku: 'UL-BAG-1000',
        cost_per_item: 15.25,
        lead_time_days: 3,
        is_preferred: true
      }
    ]
  },
  {
    product_id: 'prod_sanitizer_001',
    sku: 'SKU-HS-GAL',
    display_name: 'Hand Sanitizer, 1 Gallon',
    description: '70% alcohol hand sanitizer. Industrial size for high-traffic areas.',
    category: 'Health & Safety',
    pack_quantity: 1,
    requires_dm_approval: true,
    is_active: true,
    tags: ['sanitizer', 'health', 'safety', 'restricted'],
    vendors: [
      {
        vendor_id: 'ven_purell',
        vendor_sku: 'PU-HS-GAL',
        cost_per_item: 12.99,
        lead_time_days: 1,
        is_preferred: true
      }
    ]
  }
]

export const mockOrders: Order[] = [
  {
    order_id: 'ord_001',
    store_id: 's_12345',
    created_by_user_id: 'usr_sm_001',
    created_at: '2024-01-15T09:30:00Z',
    updated_at: '2024-01-15T14:22:00Z',
    status: 'DELIVERED',
    order_type: 'STORE_INITIATED',
    line_items: [
      {
        product_id: 'prod_paper_001',
        vendor_id: 'ven_costco',
        quantity: 2,
        unit_cost: 22.50
      },
      {
        product_id: 'prod_cleaner_001',
        vendor_id: 'ven_sysco',
        quantity: 6,
        unit_cost: 4.75
      }
    ],
    shipping_details: {
      method: 'WAREHOUSE_SHIPMENT',
      address: mockStores[0].address,
      tracking_numbers: ['300-12345-A4B1C9-1of1']
    },
    total_cost: 73.50,
    audit_history: [
      {
        timestamp: '2024-01-15T09:30:00Z',
        user_id: 'usr_sm_001',
        action: 'ORDER_CREATED',
        details: 'Order submitted by Store Manager'
      },
      {
        timestamp: '2024-01-15T10:15:00Z',
        user_id: 'usr_dm_001',
        action: 'DM_APPROVED',
        details: 'Approved by District Manager'
      },
      {
        timestamp: '2024-01-15T14:22:00Z',
        user_id: 'usr_fm_001',
        action: 'FM_APPROVED',
        details: 'Approved for fulfillment'
      }
    ]
  },
  {
    order_id: 'ord_002',
    store_id: 's_12345',
    created_by_user_id: 'usr_sm_001',
    created_at: '2024-01-18T11:45:00Z',
    updated_at: '2024-01-18T16:30:00Z',
    status: 'PENDING_FM_APPROVAL',
    order_type: 'STORE_INITIATED',
    line_items: [
      {
        product_id: 'prod_receipt_001',
        vendor_id: 'ven_posmate',
        quantity: 1,
        unit_cost: 38.99
      }
    ],
    shipping_details: {
      method: 'WAREHOUSE_SHIPMENT',
      address: mockStores[0].address,
      tracking_numbers: []
    },
    total_cost: 38.99,
    audit_history: [
      {
        timestamp: '2024-01-18T11:45:00Z',
        user_id: 'usr_sm_001',
        action: 'ORDER_CREATED',
        details: 'Order submitted by Store Manager'
      },
      {
        timestamp: '2024-01-18T16:30:00Z',
        user_id: 'usr_dm_001',
        action: 'DM_APPROVED',
        details: 'Approved by District Manager - Thermal receipt paper needed for weekend rush'
      }
    ]
  },
  {
    order_id: 'ord_003',
    store_id: 's_12345',
    created_by_user_id: 'usr_sm_001',
    created_at: '2024-01-20T08:15:00Z',
    updated_at: '2024-01-20T08:15:00Z',
    status: 'PENDING_DM_APPROVAL',
    order_type: 'STORE_INITIATED',
    line_items: [
      {
        product_id: 'prod_sanitizer_001',
        vendor_id: 'ven_purell',
        quantity: 2,
        unit_cost: 12.99
      }
    ],
    shipping_details: {
      method: 'WAREHOUSE_SHIPMENT',
      address: mockStores[0].address,
      tracking_numbers: []
    },
    total_cost: 25.98,
    audit_history: [
      {
        timestamp: '2024-01-20T08:15:00Z',
        user_id: 'usr_sm_001',
        action: 'ORDER_CREATED',
        details: 'Order submitted by Store Manager'
      }
    ]
  }
]