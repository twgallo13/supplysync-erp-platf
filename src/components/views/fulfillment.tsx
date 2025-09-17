import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Package, Truck, CheckCircle, Clock, Gear } from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { mockOrders, mockProducts, mockStores } from '@/lib/mock-data'
import { Order } from '@/lib/types'
import { toast } from 'sonner'

interface FulfillmentProps {
  onViewChange: (view: string) => void
}

const fulfillmentMethods = [
  { value: 'WAREHOUSE_SHIPMENT', label: 'Warehouse Shipment' },
  { value: 'DIRECT_SHIP', label: 'Direct Ship from Vendor' }
]

const reasonCodes = [
  'Vendor capacity constraints',
  'Cost optimization',
  'Shipping logistics',
  'Inventory consolidation',
  'Rush delivery required',
  'Other'
]

export function Fulfillment({ onViewChange }: FulfillmentProps) {
  const { user } = useAuth()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [fulfillmentMethod, setFulfillmentMethod] = useState('')
  const [reasonCode, setReasonCode] = useState('')
  const [comments, setComments] = useState('')

  if (!user || user.role !== 'FM') {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Only Facility Managers can access fulfillment management.</p>
      </div>
    )
  }

  const fulfillmentQueue = mockOrders.filter(order => 
    order.status === 'APPROVED_FOR_FULFILLMENT'
  )

  const inTransitOrders = mockOrders.filter(order => 
    order.status === 'IN_TRANSIT' || order.status === 'PARTIALLY_DELIVERED'
  )

  const getProductName = (productId: string) => {
    const product = mockProducts.find(p => p.product_id === productId)
    return product?.display_name || 'Unknown Product'
  }

  const getStoreName = (storeId: string) => {
    const store = mockStores.find(s => s.store_id === storeId)
    return store?.store_name || 'Unknown Store'
  }

  const handleFulfillment = (order: Order) => {
    if (!fulfillmentMethod) {
      toast.error('Please select a fulfillment method')
      return
    }

    toast.success(`Order #${order.order_id.slice(-6)} dispatched via ${fulfillmentMethod.replace('_', ' ')}`)
    setSelectedOrder(null)
    setFulfillmentMethod('')
    setReasonCode('')
    setComments('')
  }

  const FulfillmentDialog = ({ order }: { order: Order }) => (
    <Dialog open={!!selectedOrder && selectedOrder.order_id === order.order_id} onOpenChange={(open) => {
      if (!open) {
        setSelectedOrder(null)
        setFulfillmentMethod(order.shipping_details.method)
        setReasonCode('')
        setComments('')
      }
    }}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2" 
          onClick={() => {
            setSelectedOrder(order)
            setFulfillmentMethod(order.shipping_details.method)
          }}
        >
          <Gear size={16} />
          Configure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Fulfillment - Order #{order.order_id.slice(-6)}</DialogTitle>
          <DialogDescription>
            {getStoreName(order.store_id)} • ${order.total_cost.toFixed(2)} • {order.line_items.length} items
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <div>
            <h4 className="font-medium mb-3">Items to Fulfill</h4>
            <div className="space-y-2">
              {order.line_items.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-muted/50 rounded">
                  <span className="text-sm">{item.quantity}x {getProductName(item.product_id)}</span>
                  <span className="text-sm font-medium">${(item.quantity * item.unit_cost).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Fulfillment Method */}
          <div>
            <Label htmlFor="fulfillment-method">Fulfillment Method</Label>
            <Select value={fulfillmentMethod} onValueChange={setFulfillmentMethod}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select fulfillment method..." />
              </SelectTrigger>
              <SelectContent>
                {fulfillmentMethods.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reason Code (if changing from default) */}
          {fulfillmentMethod !== order.shipping_details.method && (
            <div>
              <Label htmlFor="reason-code">Reason for Change</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {reasonCodes.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comments */}
          <div>
            <Label htmlFor="fulfillment-comments">Comments (Optional)</Label>
            <Textarea
              id="fulfillment-comments"
              placeholder="Add any special instructions..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => handleFulfillment(order)}
              className="flex-1 gap-2"
            >
              <Package size={18} />
              Dispatch for Fulfillment
            </Button>
            <Button 
              variant="outline"
              onClick={() => setSelectedOrder(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fulfillment Management</h1>
        <p className="text-muted-foreground">
          Configure and dispatch approved orders for fulfillment
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Awaiting Dispatch</CardTitle>
            <Clock size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fulfillmentQueue.length}</div>
            <p className="text-xs text-muted-foreground">Orders ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inTransitOrders.length}</div>
            <p className="text-xs text-muted-foreground">Active shipments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Today's Dispatches</CardTitle>
            <CheckCircle size={16} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Orders dispatched</p>
          </CardContent>
        </Card>
      </div>

      {/* Fulfillment Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Fulfillment Queue</CardTitle>
          <CardDescription>Orders approved and ready for dispatch</CardDescription>
        </CardHeader>
        <CardContent>
          {fulfillmentQueue.length > 0 ? (
            <div className="space-y-4">
              {fulfillmentQueue.map((order) => (
                <div key={order.order_id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Order #{order.order_id.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">
                      {getStoreName(order.store_id)} • {order.line_items.length} items • ${order.total_cost.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline">
                        {order.shipping_details.method.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Approved {new Date(order.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <FulfillmentDialog order={order} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No orders in queue</h3>
              <p className="text-muted-foreground">
                All approved orders have been dispatched for fulfillment.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Shipments */}
      <Card>
        <CardHeader>
          <CardTitle>Active Shipments</CardTitle>
          <CardDescription>Orders currently in transit</CardDescription>
        </CardHeader>
        <CardContent>
          {inTransitOrders.length > 0 ? (
            <div className="space-y-4">
              {inTransitOrders.map((order) => (
                <div key={order.order_id} className="flex items-center justify-between border rounded-lg p-4">
                  <div className="space-y-1">
                    <p className="font-medium">Order #{order.order_id.slice(-6)}</p>
                    <p className="text-sm text-muted-foreground">
                      {getStoreName(order.store_id)} • ${order.total_cost.toFixed(2)}
                    </p>
                    {order.shipping_details.tracking_numbers.length > 0 && (
                      <p className="text-xs font-mono">
                        Tracking: {order.shipping_details.tracking_numbers[0]}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {order.status.replace('_', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Truck size={48} className="mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No active shipments</h3>
              <p className="text-muted-foreground">
                All shipments have been delivered.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}