import { useState, useEffect } f
import { Button } from '@/components/ui/button'
import { 
import { useAuth } from '../auth-provider'
  Shoppin
  House, 
  Scan,
  ShoppingCart, 
import { cn } f
import {

  icon: For
  key: string
  badge


    label: 'Dashboard',
    roles: ['SM', 'D
  {
 

  {
    label: '
    roles: ['SM
  {
    label: 'Appr
    roles: ['DM', 'FM']
  {
 

  {
   
    id: 'dashboard',
    label: 'Dashboard',
    icon: House,
    permissions: []
  },
  {
    id: 'catalog',
    label: 'Order Supplies',
    icon: Package,
    permissions: ['catalog:view'],
    roles: ['SM']
  },
  {
    id: 'orders',
    label: 'My Orders',
    icon: ShoppingCart,
    permissions: ['orders:view_own', 'orders:view_district'],
    roles: ['SM', 'DM', 'FM']
  },
  {
    id: 'approvals',
    label: 'Approvals',
    icon: CheckSquare,
    badge: 7,
    permissions: ['approvals:view_district'],
    roles: ['DM', 'FM']
  },
  {
    id: 'fulfillment',
    label: 'Fulfillment',
    icon: Truck,
    badge: 3,
      const inboundCount = orders.filter
        (user.rol
    
   
  }
  return (
      <nav className="p-
          const Icon = item.icon
          const badgeTe
    
   
              classN
                isActiv
              onCli
              <Icon size={20} weight={is
              {badgeText && (
    
   
                </Badge>
            </Button>
        })}
    </aside>
}













































































