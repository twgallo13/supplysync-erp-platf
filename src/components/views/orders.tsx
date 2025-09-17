import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Eye, Clock, CheckCircle, XCircle, Truck, Package, ArrowClockwise } from '@phosphor-icons/react'
import { Order, OrderStatus } from '@/types'
import { apiService } from '@/services/api'
import { useAuth } from '@/components/auth-provider'
import { toast } from 'sonner'

interface OrdersProps {
  onViewChange: (view: string) => void
}

const statusConfig = {
  PENDING_DM_APPROVAL: {
    label: 'Pending DM Approval',
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-yellow-600'
  },
  PENDING_FM_APPROVAL: {
    label: 'Pending FM Approval', 
    icon: Clock,
    variant: 'secondary' as const,
    color: 'text-blue-600'
  },
  APPROVED_FOR_FULFILLMENT: {
    label: 'Approved for Fulfillment',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-600'
  },
  IN_TRANSIT: {
    label: 'In Transit',
    icon: Truck,
    variant: 'default' as const,
    color: 'text-blue-600'
  },
  PARTIALLY_DELIVERED: {
    label: 'Partially Delivered',
    icon: Package,
    variant: 'default' as const,
    color: 'text-orange-600'
  },
  DELIVERED: {
    label: 'Delivered',
    icon: CheckCircle,
    variant: 'default' as const,
    color: 'text-green-600'
  },
  REJECTED: {
    label: 'Rejected',
    icon: XCircle,
    variant: 'destructive' as const,
    color: 'text-red-600'
  },
  CANCELLED: {
    label: 'Cancelled',
    icon: XCircle,
    variant: 'secondary' as const,
    color: 'text-gray-600'
  }
}

export function Orders({ onViewChange }: OrdersProps) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadOrders()
  }, [user])

  const loadOrders = async () => {
    if (!user) return
    
    try {
      setIsLoading(true)
      const ordersData = await apiService.getOrders(
        user.assignment.type === 'store' ? user.assignment.id : undefined
      )
      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getOrderProducts = async (order: Order) => {
    const products = await Promise.all(
      order.line_items.map(async (item) => {
        const product = await apiService.getProduct(item.product_id)
        return { ...item, product }
      })
    )
    return products
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Order History</h1>
          <p className="text-muted-foreground">Track your supply orders and their status</p>
        </div>
        <Button onClick={loadOrders} variant="outline">
          <ArrowClockwise className="mr-2" size={16} />
          Refresh
        </Button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {orders.map((order) => {
          const statusInfo = statusConfig[order.status]
          const StatusIcon = statusInfo.icon
          
          return (
            <Card key={order.order_id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        Order #{order.order_id.slice(-8)}
                      </CardTitle>
                      <CardDescription>
                        Created {formatDate(order.created_at)} • {order.line_items.length} items
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusInfo.variant} className="gap-1">
                      <StatusIcon size={12} />
                      {statusInfo.label}
                    </Badge>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="mr-2" size={16} />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl">
                        <OrderDetails order={order} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                    <p className="font-semibold">${order.total_cost.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order Type</p>
                    <p className="font-semibold">{order.order_type.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p className="font-semibold">{formatDate(order.updated_at)}</p>
                  </div>
                </div>
                
                {order.status === 'REJECTED' && order.rejection_reason && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {order.rejection_reason.replace('_', ' ')}
                      {order.rejection_comment && ` - ${order.rejection_comment}`}
                    </p>
                  </div>
                )}
                
                {order.shipping_details.tracking_numbers.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">Tracking Numbers:</p>
                    <div className="flex flex-wrap gap-2">
                      {order.shipping_details.tracking_numbers.map((tracking, index) => (
                        <Badge key={index} variant="outline" className="font-mono">
                          {tracking}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No orders found</h3>
          <p className="text-muted-foreground mb-4">
            You haven't placed any orders yet. Browse the catalog to get started.
          </p>
          <Button onClick={() => onViewChange('catalog')}>
            Browse Catalog
          </Button>
        </div>
      )}
    </div>
  )
}

function OrderDetails({ order }: { order: Order }) {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadOrderProducts()
  }, [order])

  const loadOrderProducts = async () => {
    try {
      const productDetails = await Promise.all(
        order.line_items.map(async (item) => {
          const product = await apiService.getProduct(item.product_id)
          return { ...item, product }
        })
      )
      setProducts(productDetails)
    } catch (error) {
      console.error('Error loading product details:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statusInfo = statusConfig[order.status]
  const StatusIcon = statusInfo.icon

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-3">
          Order #{order.order_id.slice(-8)}
          <Badge variant={statusInfo.variant} className="gap-1">
            <StatusIcon size={12} />
            {statusInfo.label}
          </Badge>
        </DialogTitle>
        <DialogDescription>
          Created on {new Date(order.created_at).toLocaleDateString()} • 
          Last updated {new Date(order.updated_at).toLocaleDateString()}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Order Items */}
        <div>
          <h4 className="font-semibold mb-3">Order Items</h4>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : (
              products.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <h5 className="font-medium">{item.product?.display_name || 'Unknown Product'}</h5>
                    <p className="text-sm text-muted-foreground">
                      SKU: {item.product?.sku || 'N/A'} • Quantity: {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.unit_cost * item.quantity).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">${item.unit_cost.toFixed(2)} each</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <Separator />

        {/* Order Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-3">Order Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Type:</span>
                <span>{order.order_type.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fulfillment Method:</span>
                <span>{order.shipping_details.method.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Items:</span>
                <span>{order.line_items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Total Cost:</span>
                <span>${order.total_cost.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3">Shipping Address</h4>
            <div className="text-sm">
              <p>{order.shipping_details.address.street}</p>
              <p>
                {order.shipping_details.address.city}, {order.shipping_details.address.state} {order.shipping_details.address.zip}
              </p>
            </div>
          </div>
        </div>

        {/* Tracking Information */}
        {order.shipping_details.tracking_numbers.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold mb-3">Tracking Information</h4>
              <div className="space-y-2">
                {order.shipping_details.tracking_numbers.map((tracking, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="font-mono text-sm">{tracking}</span>
                    <Badge variant="outline">Package {index + 1}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Audit History */}
        <Separator />
        <div>
          <h4 className="font-semibold mb-3">Order History</h4>
          <div className="space-y-3">
            {order.audit_history.map((entry, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-sm">{entry.action.replace('_', ' ')}</p>
                  <p className="text-sm text-muted-foreground">{entry.details}</p>
                  {entry.reason_code && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Reason: {entry.reason_code.replace('_', ' ')}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(entry.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}