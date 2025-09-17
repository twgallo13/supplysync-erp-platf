import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle, XCircle, Clock, Eye } from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { mockOrders, mockProducts, mockStores } from '@/lib/mock-data'
import { Order } from '@/lib/types'
import { toast } from 'sonner'

const rejectionReasons = {
  DM: [
    'Budgetary constraints',
    'Off-cycle request',
    'Alternative supplier preferred',
    'Insufficient documentation',
    'Duplicate order',
    'Other'
  ],
  FM: [
    'Inventory already sufficient',
    'Vendor capacity constraints',
    'Shipping logistics issue',
    'Cost optimization opportunity',
    'Seasonal timing inappropriate',
    'Other'
  ]
}

interface ApprovalsProps {
  onViewChange: (view: string) => void
}

export function Approvals({ onViewChange }: ApprovalsProps) {
  const { user } = useAuth()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [comments, setComments] = useState('')

  if (!user || (user.role !== 'DM' && user.role !== 'FM')) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">You don't have permission to view approvals.</p>
      </div>
    )
  }

  const pendingOrders = mockOrders.filter(order => {
    if (user.role === 'DM') {
      return order.status === 'PENDING_DM_APPROVAL'
    }
    if (user.role === 'FM') {
      return order.status === 'PENDING_FM_APPROVAL'
    }
    return false
  })

  const getProductName = (productId: string) => {
    const product = mockProducts.find(p => p.product_id === productId)
    return product?.display_name || 'Unknown Product'
  }

  const getStoreName = (storeId: string) => {
    const store = mockStores.find(s => s.store_id === storeId)
    return store?.store_name || 'Unknown Store'
  }

  const handleApproval = (order: Order, approved: boolean) => {
    if (approved) {
      const nextStatus = user.role === 'DM' ? 'PENDING_FM_APPROVAL' : 'APPROVED_FOR_FULFILLMENT'
      toast.success(`Order #${order.order_id.slice(-6)} approved and forwarded to ${user.role === 'DM' ? 'Facility Manager' : 'fulfillment'}`)
    } else {
      if (!rejectionReason) {
        toast.error('Please select a reason for rejection')
        return
      }
      toast.success(`Order #${order.order_id.slice(-6)} rejected`)
    }
    
    setSelectedOrder(null)
    setActionType(null)
    setRejectionReason('')
    setComments('')
  }

  const ApprovalDialog = ({ order }: { order: Order }) => (
    <Dialog open={!!selectedOrder && selectedOrder.order_id === order.order_id} onOpenChange={(open) => {
      if (!open) {
        setSelectedOrder(null)
        setActionType(null)
        setRejectionReason('')
        setComments('')
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setSelectedOrder(order)}>
          <Eye size={16} />
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Order #{order.order_id.slice(-6)}</DialogTitle>
          <DialogDescription>
            Submitted by {getStoreName(order.store_id)} on {new Date(order.created_at).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Order Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Store</Label>
              <p className="font-medium">{getStoreName(order.store_id)}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Total Value</Label>
              <p className="font-medium text-lg">${order.total_cost.toFixed(2)}</p>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <h4 className="font-medium mb-3">Items Requested</h4>
            <div className="space-y-3">
              {order.line_items.map((item, index) => {
                const product = mockProducts.find(p => p.product_id === item.product_id)
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{getProductName(item.product_id)}</p>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} • Unit Cost: ${item.unit_cost}
                      </p>
                      {product?.requires_dm_approval && (
                        <Badge variant="outline" className="mt-1">
                          Restricted Item
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${(item.quantity * item.unit_cost).toFixed(2)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Order History */}
          <div>
            <h4 className="font-medium mb-3">Order History</h4>
            <div className="space-y-2">
              {order.audit_history.map((entry, index) => (
                <div key={index} className="text-sm border-l-2 border-muted pl-3">
                  <p className="font-medium">{entry.action.replace(/_/g, ' ')}</p>
                  <p className="text-muted-foreground">{entry.details}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Section */}
          {!actionType ? (
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => setActionType('approve')}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle size={18} />
                Approve Order
              </Button>
              <Button 
                onClick={() => setActionType('reject')}
                variant="destructive"
                className="flex-1 gap-2"
              >
                <XCircle size={18} />
                Reject Order
              </Button>
            </div>
          ) : actionType === 'approve' ? (
            <div className="space-y-4 pt-4 border-t">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Approve this order?</h4>
                <p className="text-sm text-green-700">
                  This order will be {user.role === 'DM' ? 'forwarded to the Facility Manager for final approval' : 'approved for fulfillment'}.
                </p>
              </div>
              
              <div>
                <Label htmlFor="approval-comments">Comments (Optional)</Label>
                <Textarea
                  id="approval-comments"
                  placeholder="Add any comments about this approval..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => handleApproval(order, true)}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle size={18} />
                  Confirm Approval
                </Button>
                <Button 
                  onClick={() => setActionType(null)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-4 border-t">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Reject this order?</h4>
                <p className="text-sm text-red-700">
                  This order will be returned to the submitter with your rejection reason.
                </p>
              </div>

              <div>
                <Label htmlFor="rejection-reason">Reason for Rejection *</Label>
                <Select value={rejectionReason} onValueChange={setRejectionReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rejectionReasons[user.role as keyof typeof rejectionReasons].map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rejection-comments">Additional Comments</Label>
                <Textarea
                  id="rejection-comments"
                  placeholder="Provide additional context for the rejection..."
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => handleApproval(order, false)}
                  variant="destructive"
                  className="gap-2"
                  disabled={!rejectionReason}
                >
                  <XCircle size={18} />
                  Confirm Rejection
                </Button>
                <Button 
                  onClick={() => setActionType(null)}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approval Queue</h1>
        <p className="text-muted-foreground">
          Review and approve pending supply requests
        </p>
      </div>

      {/* Pending Orders */}
      <div className="space-y-4">
        {pendingOrders.map((order) => (
          <Card key={order.order_id} className="border-l-4 border-l-yellow-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock size={18} className="text-yellow-600" />
                    Order #{order.order_id.slice(-6)}
                  </CardTitle>
                  <CardDescription>
                    Submitted {new Date(order.created_at).toLocaleDateString()} • {getStoreName(order.store_id)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Pending {user.role} Approval
                  </Badge>
                  <ApprovalDialog order={order} />
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
                  <p className="text-sm font-medium text-muted-foreground">Days Pending</p>
                  <p className="font-medium">
                    {Math.ceil((new Date().getTime() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              </div>

              {/* Quick item preview */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground mb-2">Items requested:</p>
                <div className="flex flex-wrap gap-2">
                  {order.line_items.slice(0, 3).map((item, index) => {
                    const product = mockProducts.find(p => p.product_id === item.product_id)
                    return (
                      <Badge key={index} variant="outline" className="text-xs">
                        {item.quantity}x {getProductName(item.product_id)}
                        {product?.requires_dm_approval && <span className="ml-1">⚠️</span>}
                      </Badge>
                    )
                  })}
                  {order.line_items.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{order.line_items.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pendingOrders.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-lg font-medium mb-2">All caught up!</h3>
          <p className="text-muted-foreground">
            No orders are pending your approval at this time.
          </p>
        </div>
      )}
    </div>
  )
}