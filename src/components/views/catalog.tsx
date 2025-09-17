import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { MagnifyingGlass, ShoppingCart, Warning, Plus, Minus } from '@phosphor-icons/react'
import { mockProducts } from '@/lib/mock-data'
import { Product, CartItem, Order, LineItem } from '@/lib/types'
import { useKV } from '@github/spark/hooks'
import { useAuth } from '../auth-provider'
import { toast } from 'sonner'

interface CatalogProps {
  onViewChange: (view: string) => void
}

export function Catalog({ onViewChange }: CatalogProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [cart, setCart] = useKV<CartItem[]>('shopping-cart', [])
  const { user } = useAuth()
  const [orders, setOrders] = useKV<Order[]>('user-orders', [])

  const categories = ['all', ...Array.from(new Set(mockProducts.map(p => p.category)))]
  
  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory
    return matchesSearch && matchesCategory && product.is_active
  })

  const addToCart = (product: Product, quantity: number = 1) => {
    const preferredVendor = product.vendors.find(v => v.is_preferred) || product.vendors[0]
    
    setCart(currentCart => {
      const safeCart = currentCart || []
      const existingItem = safeCart.find(item => item.product.product_id === product.product_id)
      
      if (existingItem) {
        return safeCart.map(item =>
          item.product.product_id === product.product_id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      } else {
        return [...safeCart, {
          product,
          quantity,
          selected_vendor: preferredVendor
        }]
      }
    })
    
    toast.success(`Added ${product.display_name} to cart`)
  }

  const updateCartQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(currentCart => (currentCart || []).filter(item => item.product.product_id !== productId))
      return
    }
    
    setCart(currentCart => 
      (currentCart || []).map(item =>
        item.product.product_id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    )
  }

  const getCartQuantity = (productId: string) => {
    const item = (cart || []).find(item => item.product.product_id === productId)
    return item?.quantity || 0
  }

  const cartTotal = (cart || []).reduce((sum, item) => 
    sum + (item.selected_vendor.cost_per_item * item.quantity), 0
  )

  const submitOrder = () => {
    if (!user || !cart || cart.length === 0) {
      toast.error('Cannot submit empty order')
      return
    }

    // Check if any items require DM approval to determine workflow
    const requiresApproval = cart.some(item => item.product.requires_dm_approval)
    
    // Convert cart items to line items
    const lineItems: LineItem[] = cart.map(item => ({
      product_id: item.product.product_id,
      vendor_id: item.selected_vendor.vendor_id,
      quantity: item.quantity,
      unit_cost: item.selected_vendor.cost_per_item
    }))

    // Create new order
    const newOrder: Order = {
      order_id: `ord_${Date.now()}`,
      store_id: user.assignment.id,
      created_by_user_id: user.user_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: requiresApproval ? 'PENDING_DM_APPROVAL' : 'PENDING_FM_APPROVAL',
      order_type: 'STORE_INITIATED',
      line_items: lineItems,
      shipping_details: {
        method: 'WAREHOUSE_SHIPMENT',
        address: {
          street: '123 Main Street',
          city: 'Metropolitan City',
          state: 'CA',
          zip: '90210'
        },
        tracking_numbers: []
      },
      total_cost: cartTotal,
      audit_history: [{
        timestamp: new Date().toISOString(),
        user_id: user.user_id,
        action: 'ORDER_CREATED',
        details: `Order submitted by ${user.role} - Total: $${cartTotal.toFixed(2)}`
      }]
    }

    // Save the order
    setOrders(currentOrders => [...(currentOrders || []), newOrder])
    
    // Clear the cart
    setCart([])
    
    // Show success message
    const statusText = requiresApproval ? 'submitted for District Manager approval' : 'submitted for Facility Manager approval'
    toast.success(`Order #${newOrder.order_id.slice(-8)} ${statusText}!`)
    
    // Navigate to orders page
    onViewChange('orders')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">
            Browse and order supplies for your location
          </p>
        </div>
        
        {(cart || []).length > 0 && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <ShoppingCart size={18} />
                Cart ({(cart || []).length}) • ${cartTotal.toFixed(2)}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Shopping Cart</DialogTitle>
                <DialogDescription>
                  Review your items before placing the order
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {(cart || []).map((item) => (
                  <div key={item.product.product_id} className="flex items-center justify-between border-b pb-3">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.product.display_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ${item.selected_vendor.cost_per_item} each
                      </p>
                      {item.product.requires_dm_approval && (
                        <Badge variant="outline" className="mt-1">
                          <Warning size={12} className="mr-1" />
                          Requires Approval
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product.product_id, item.quantity - 1)}
                      >
                        <Minus size={12} />
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => updateCartQuantity(item.product.product_id, item.quantity + 1)}
                      >
                        <Plus size={12} />
                      </Button>
                      <span className="w-16 text-right font-medium">
                        ${(item.selected_vendor.cost_per_item * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-4 border-t">
                  <span className="font-semibold">Total: ${cartTotal.toFixed(2)}</span>
                  <div className="gap-2 flex">
                    <Button variant="outline" onClick={() => setCart([])}>
                      Clear Cart
                    </Button>
                    <Button onClick={() => submitOrder()}>
                      Submit Order
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(category => (
              <SelectItem key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => {
          const preferredVendor = product.vendors.find(v => v.is_preferred) || product.vendors[0]
          const cartQuantity = getCartQuantity(product.product_id)
          
          return (
            <Card key={product.product_id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{product.display_name}</CardTitle>
                    <CardDescription className="text-sm">
                      SKU: {product.sku}
                    </CardDescription>
                  </div>
                  {product.requires_dm_approval && (
                    <Badge variant="outline" className="text-xs">
                      <Warning size={12} className="mr-1" />
                      Approval Required
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <p className="text-sm text-muted-foreground mb-4 flex-1">
                  {product.description}
                </p>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Price:</span>
                    <span className="font-semibold">${preferredVendor.cost_per_item}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Lead Time:</span>
                    <span className="text-sm">{preferredVendor.lead_time_days} days</span>
                  </div>
                  
                  <Badge variant="secondary" className="w-fit">
                    {product.category}
                  </Badge>
                </div>

                <div className="mt-4 pt-4 border-t">
                  {cartQuantity > 0 ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateCartQuantity(product.product_id, cartQuantity - 1)}
                        >
                          <Minus size={12} />
                        </Button>
                        <span className="w-8 text-center font-medium">{cartQuantity}</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => updateCartQuantity(product.product_id, cartQuantity + 1)}
                        >
                          <Plus size={12} />
                        </Button>
                      </div>
                      <span className="font-medium">
                        ${(preferredVendor.cost_per_item * cartQuantity).toFixed(2)}
                      </span>
                    </div>
                  ) : (
                    <Button 
                      onClick={() => addToCart(product)}
                      className="w-full gap-2"
                    >
                      <ShoppingCart size={16} />
                      Add to Cart
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No products found matching your search.</p>
        </div>
      )}
    </div>
  )
}