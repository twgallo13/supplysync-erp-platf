import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Eye, Package } from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { mockOrders, mockProducts, mockStores } from '@/lib/mock-data'
import { Order } from '@/lib/types'

interface OrdersProps {
  onViewChange: (view: string) => void
}

export function Orders({ onViewChange }: OrdersProps) {
  const { user } = useAuth()

  if (!user) return null

  const userOrders = mockOrders.filter(order => {
    if (user.role === 'SM') {
      return order.store_id === user.assignment.id
    }
    if (user.role === 'DM') {
      const store = mockStores.find(s => s.store_id === order.store_id)
      return store?.district_id === user.assignment.id
    }
    return true // FM and other roles see all orders
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'DELIVERED': { variant: 'default' as const, color: 'bg-green-100 text-green-800' },
      'PENDING_DM_APPROVAL': { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800' },
      'PENDING_FM_APPROVAL': { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
      'IN_TRANSIT': { variant: 'outline' as const, color: 'bg-purple-100 text-purple-800' },
      'APPROVED_FOR_FULFILLMENT': { variant: 'outline' as const, color: 'bg-green-100 text-green-800' },
      'REJECTED': { variant: 'destructive' as const, color: 'bg-red-100 text-red-800' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['PENDING_DM_APPROVAL']
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {status.replace(/_/g, ' ')}
      </Badge>
    )
  }

  const getProductName = (productId: string) => {
    const product = mockProducts.find(p => p.product_id === productId)
    return product?.display_name || 'Unknown Product'
  }

  const getStoreName = (storeId: string) => {
    const store = mockStores.find(s => s.store_id === storeId)
    return store?.store_name || 'Unknown Store'
  }

  const OrderDetailsDialog = ({ order }: { order: Order }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye size={16} />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order #{order.order_id.slice(-6)}</DialogTitle>
          <DialogDescription>
            Created on {new Date(order.created_at).toLocaleDateString()} • {getStoreName(order.store_id)}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Status */}
          <div className="flex items-center justify-between">
            <span className="font-medium">Status:</span>
            {getStatusBadge(order.status)}
          </div>

          {/* Line Items */}
          <div>
            <h4 className="font-medium mb-3">Items Ordered</h4>
            <div className="space-y-3">
              {order.line_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{getProductName(item.product_id)}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} • Unit Cost: ${item.unit_cost}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.quantity * item.unit_cost).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <Separator className="my-3" />
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold text-lg">${order.total_cost.toFixed(2)}</span>
            </div>
          </div>

          {/* Shipping Information */}
          <div>
            <h4 className="font-medium mb-3">Shipping Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Method:</span> {order.shipping_details.method.replace('_', ' ')}</p>
              <p><span className="font-medium">Address:</span></p>
              <div className="ml-4 text-muted-foreground">
                <p>{order.shipping_details.address.street}</p>
                <p>{order.shipping_details.address.city}, {order.shipping_details.address.state} {order.shipping_details.address.zip}</p>
              </div>
              {order.shipping_details.tracking_numbers.length > 0 && (
                <div>
                  <p className="font-medium">Tracking Numbers:</p>
                  <div className="ml-4">
                    {order.shipping_details.tracking_numbers.map((tracking, index) => (
                      <p key={index} className="font-mono text-sm">{tracking}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Audit History */}
          <div>
            <h4 className="font-medium mb-3">Order History</h4>
            <div className="space-y-3">
              {order.audit_history.map((entry, index) => (
                <div key={index} className="border-l-2 border-primary/20 pl-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{entry.action.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">{entry.details}</p>
                      {entry.reason_code && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          {entry.reason_code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Orders</h1>
          <p className="text-muted-foreground">
            Track and manage your supply requests
          </p>
        </div>
        {user.role === 'SM' && (
          <Button onClick={() => onViewChange('catalog')} className="gap-2">
            <Package size={18} />
            New Order
          </Button>
        )}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {userOrders.map((order) => (
          <Card key={order.order_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Order #{order.order_id.slice(-6)}</CardTitle>
                  <CardDescription>
                    {new Date(order.created_at).toLocaleDateString()} • {getStoreName(order.store_id)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {getStatusBadge(order.status)}
                  <OrderDetailsDialog order={order} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Items</p>
                  <p className="font-medium">{order.line_items.length} item(s)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                  <p className="font-medium">${order.total_cost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fulfillment</p>
                  <p className="font-medium">{order.shipping_details.method.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Show line items preview */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Items:</p>
                <div className="space-y-1">
                  {order.line_items.slice(0, 2).map((item, index) => (
                    <p key={index} className="text-sm">
                      {item.quantity}x {getProductName(item.product_id)}
                    </p>
                  ))}
                  {order.line_items.length > 2 && (
                    <p className="text-sm text-muted-foreground">
                      +{order.line_items.length - 2} more item(s)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {userOrders.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No orders found</h3>
          <p className="text-muted-foreground mb-4">
            You haven't placed any orders yet.
          </p>
          {user.role === 'SM' && (
            <Button onClick={() => onViewChange('catalog')} className="gap-2">
              <Package size={18} />
              Browse Catalog
            </Button>
          )}
        </div>
      )}
    </div>
  )
}