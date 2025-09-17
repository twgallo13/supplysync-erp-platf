import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { CheckCircle, XCircle, Clock, Eye, Warning } from '@phosphor-icons/react'
import { useAuth } from '../auth-provider'
import { Order, RejectionReasonCode, REJECTION_REASON_CODES } from '@/types'
import { apiService } from '@/services/api'
import { toast } from 'sonner'

interface ApprovalsProps {
  onViewChange: (view: string) => void
}

export function Approvals({ onViewChange }: ApprovalsProps) {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)
  const [rejectionReason, setRejectionReason] = useState<RejectionReasonCode | ''>('')
  const [comments, setComments] = useState('')
  const [products, setProducts] = useState<any[]>([])

  useEffect(() => {
    loadOrders()
  }, [user])

  const loadOrders = async () => {
    if (!user || (user.role !== 'DM' && user.role !== 'FM')) return
    
    try {
      setIsLoading(true)
      const ordersData = await apiService.getOrders()
      
      // Filter orders that need approval from current user role
      const pendingOrders = ordersData.filter(order => {
        if (user.role === 'DM') {
          return order.status === 'PENDING_DM_APPROVAL'
        }
        if (user.role === 'FM') {
          return order.status === 'PENDING_FM_APPROVAL'
        }
        return false
      })
      
      setOrders(pendingOrders)
    } catch (error) {
      console.error('Error loading orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setIsLoading(false)
    }
  }

  const loadOrderProducts = async (order: Order) => {
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
    }
  }

  const handleApproval = async (order: Order, approved: boolean) => {
    try {
      if (approved) {
        await apiService.approveOrder(order.order_id, user!.user_id, user!.role)
        toast.success(`Order #${order.order_id.slice(-8)} approved successfully`)
      } else {
        if (!rejectionReason) {
          toast.error('Please select a reason for rejection')
          return
        }
        await apiService.rejectOrder(order.order_id, user!.user_id, rejectionReason, comments || undefined)
        toast.success(`Order #${order.order_id.slice(-8)} rejected`)
      }
      
      // Reload orders to update the list
      await loadOrders()
      
      // Reset form
      setSelectedOrder(null)
      setActionType(null)
      setRejectionReason('')
      setComments('')
    } catch (error) {
      console.error('Error processing order:', error)
      toast.error('Failed to process order')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDaysPending = (createdAt: string) => {
    return Math.ceil((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
  }

  if (!user || (user.role !== 'DM' && user.role !== 'FM')) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Warning className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to view the approval queue.</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading approval queue...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Approval Queue</h1>
        <p className="text-muted-foreground">
          Review and approve pending supply requests as a {user.role === 'DM' ? 'District Manager' : 'Facility Manager'}
        </p>
      </div>

      {/* Pending Orders */}
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.order_id} className="border-l-4 border-l-yellow-400">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock size={18} className="text-yellow-600" />
                    Order #{order.order_id.slice(-8)}
                  </CardTitle>
                  <CardDescription>
                    Submitted {formatDate(order.created_at)} • {order.line_items.length} items • ${order.total_cost.toFixed(2)}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    Pending {user.role} Approval
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSelectedOrder(order)
                          loadOrderProducts(order)
                        }}
                      >
                        <Eye className="mr-2" size={16} />
                        Review
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                      <ApprovalDialog 
                        order={order} 
                        products={products}
                        actionType={actionType}
                        setActionType={setActionType}
                        rejectionReason={rejectionReason}
                        setRejectionReason={setRejectionReason}
                        comments={comments}
                        setComments={setComments}
                        onApproval={handleApproval}
                        userRole={user.role}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order Type</p>
                  <p className="font-semibold">{order.order_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Days Pending</p>
                  <p className="font-semibold">{getDaysPending(order.created_at)} days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fulfillment</p>
                  <p className="font-semibold">{order.shipping_details.method.replace('_', ' ')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
          <p className="text-muted-foreground">
            No orders are pending your approval at this time.
          </p>
        </div>
      )}
    </div>
  )
}

function ApprovalDialog({ 
  order, 
  products,
  actionType, 
  setActionType, 
  rejectionReason, 
  setRejectionReason, 
  comments, 
  setComments, 
  onApproval,
  userRole 
}: {
  order: Order
  products: any[]
  actionType: 'approve' | 'reject' | null
  setActionType: (type: 'approve' | 'reject' | null) => void
  rejectionReason: RejectionReasonCode | ''
  setRejectionReason: (reason: RejectionReasonCode | '') => void
  comments: string
  setComments: (comments: string) => void
  onApproval: (order: Order, approved: boolean) => void
  userRole: string
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Review Order #{order.order_id.slice(-8)}</DialogTitle>
        <DialogDescription>
          Submitted on {new Date(order.created_at).toLocaleDateString()} • Total: ${order.total_cost.toFixed(2)}
        </DialogDescription>
      </DialogHeader>
      
      <div className="space-y-6">
        {/* Order Items */}
        <div>
          <h4 className="font-semibold mb-3">Items Requested</h4>
          <div className="space-y-3">
            {products.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                <div className="flex-1">
                  <h5 className="font-medium">{item.product?.display_name || 'Loading...'}</h5>
                  <p className="text-sm text-muted-foreground">
                    SKU: {item.product?.sku || 'N/A'} • Quantity: {item.quantity} • Unit Cost: ${item.unit_cost.toFixed(2)}
                  </p>
                  {item.product?.requires_dm_approval && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      <Warning size={12} className="mr-1" />
                      Restricted Item
                    </Badge>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-medium">${(item.quantity * item.unit_cost).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order History */}
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
                This order will be {userRole === 'DM' ? 'forwarded to the Facility Manager for final approval' : 'approved for fulfillment'}.
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
                onClick={() => onApproval(order, true)}
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
              <Select value={rejectionReason} onValueChange={(value) => setRejectionReason(value as RejectionReasonCode)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a reason..." />
                </SelectTrigger>
                <SelectContent>
                  {REJECTION_REASON_CODES.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason.replace('_', ' ')}
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
                onClick={() => onApproval(order, false)}
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
    </>
  )
}