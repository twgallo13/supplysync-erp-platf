import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { MagnifyingGlass, ShoppingCart, Plus, Minus, Warning, Package, X, LinkSimple } from '@phosphor-icons/react'
import { apiService } from '@/services/api'
import { toast } from 'sonner'
import { Product, CartItem } from '@/types'
import { useAuth } from '@/components/auth-provider'

interface CatalogProps {
  onViewChange: (view: string) => void
  deepLinkProductId?: string
}

export function Catalog({ onViewChange, deepLinkProductId }: CatalogProps) {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCart, setShowCart] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [detailsProduct, setDetailsProduct] = useState<Product | null>(null)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Open details when deep link is provided
  useEffect(() => {
    if (!deepLinkProductId || products.length === 0) return
    const p = products.find((pr) => pr.product_id === deepLinkProductId)
    if (p) {
      openProductDetails(p, { updateHash: false })
    }
  }, [deepLinkProductId, products])

  const openProductDetails = (product: Product, opts: { updateHash?: boolean } = { updateHash: true }) => {
    setDetailsProduct(product)
    setDetailsOpen(true)
    if (opts.updateHash !== false) {
      window.location.hash = `#catalog/${product.product_id}`
    }
  }

  const closeProductDetails = () => {
    setDetailsOpen(false)
    setDetailsProduct(null)
    // Keep user in catalog context when closing
    if (window.location.hash.startsWith('#catalog/')) {
      window.location.hash = '#catalog'
    }
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [productsData, categoriesData] = await Promise.all([
        apiService.getProducts(),
        apiService.getCategories(),
      ])
      setProducts(productsData)
      setCategories(['', ...categoriesData])
    } catch (error) {
      console.error('Error loading catalog:', error)
      toast.error('Failed to load catalog')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredProducts = products.filter((product) => {
    const term = searchTerm.trim().toLowerCase()
    if (
      term &&
      !product.display_name.toLowerCase().includes(term) &&
      !product.description.toLowerCase().includes(term) &&
      !product.tags.some((tag) => tag.toLowerCase().includes(term))
    ) {
      return false
    }
    if (selectedCategory && product.category !== selectedCategory) {
      return false
    }
    return product.is_active
  })

  const addToCart = (product: Product, quantity = 1) => {
    // Guard: don't add items without any vendors
    if (!product.vendors || product.vendors.length === 0) {
      toast.error(`No vendor available for ${product.display_name}`)
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.product_id)
      const vendorId =
        product.vendors.find((v) => v.is_preferred)?.vendor_id || product.vendors[0]?.vendor_id
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.product_id ? { ...i, quantity: i.quantity + quantity } : i,
        )
      }
      return [
        ...prev,
        {
          product_id: product.product_id,
          quantity,
          selected_vendor_id: vendorId,
        },
      ]
    })
    toast.success(`Added ${product.display_name} to cart`)
  }

  const updateCartQuantity = (productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((i) => i.product_id !== productId)
      return prev.map((i) => (i.product_id === productId ? { ...i, quantity } : i))
    })
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const product = products.find((p) => p.product_id === item.product_id)
      if (!product) return total
      const selectedVendor =
        product.vendors.find((v) => v.vendor_id === item.selected_vendor_id) || product.vendors[0]
      const price = selectedVendor?.cost_per_item ?? 0
      return total + price * item.quantity
    }, 0)
  }

  const submitOrder = async () => {
    if (!user?.assignment?.id || cart.length === 0) return
    try {
      setIsSubmittingOrder(true)
      await apiService.createOrder(cart, user.assignment.id, user.user_id)
      setCart([])
      setShowCart(false)
      toast.success('Order submitted successfully!')
      onViewChange('orders')
    } catch (error) {
      console.error('Error submitting order:', error)
      toast.error('Failed to submit order')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading catalog...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Supply Catalog</h1>
          <p className="text-muted-foreground">Browse and order supplies for your location</p>
        </div>
        <Button onClick={() => setShowCart(true)} className="relative" disabled={cart.length === 0}>
          <ShoppingCart className="mr-2" size={16} />
          Cart ({cart.length})
          {cart.length > 0 && (
            <Badge className="absolute -top-2 -right-2 px-1 min-w-[20px] h-5">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </Badge>
          )}
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Categories</SelectItem>
            {categories
              .filter((c) => c)
              .map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.product_id} product={product} onAddToCart={addToCart} onOpenDetails={openProductDetails} />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Cart Dialog */}
      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Shopping Cart</DialogTitle>
            <DialogDescription>Review your order before submitting</DialogDescription>
          </DialogHeader>
          {/* Warn if any items have no available vendor */}
          {cart.some((ci) => {
            const p = products.find((p) => p.product_id === ci.product_id)
            return !p || !p.vendors || p.vendors.length === 0
          }) && (
            <div className="flex items-center gap-2 p-3 border rounded-md bg-amber-50 text-amber-900">
              <Warning size={16} />
              <span>
                Some items have no available vendor. Remove them to proceed.
              </span>
            </div>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {cart.map((item) => {
              const product = products.find((p) => p.product_id === item.product_id)
              if (!product) return null
              const selectedVendor =
                product.vendors.find((v) => v.vendor_id === item.selected_vendor_id) || product.vendors[0]
              return (
                <div key={item.product_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{product.display_name}</h4>
                    {selectedVendor ? (
                      <p className="text-sm text-muted-foreground">
                        ${selectedVendor.cost_per_item.toFixed(2)} each • {selectedVendor.vendor_name || 'Unknown Vendor'}
                      </p>
                    ) : (
                      <p className="text-sm text-destructive">No vendor available</p>
                    )}
                    {product.requires_dm_approval && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <Warning size={12} className="mr-1" /> Requires Approval
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}>
                      <Minus size={12} />
                    </Button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <Button variant="outline" size="sm" onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}>
                      <Plus size={12} />
                    </Button>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-medium">{selectedVendor ? `$${(selectedVendor.cost_per_item * item.quantity).toFixed(2)}` : '—'}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {cart.length > 0 && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="text-lg font-semibold">Total:</div>
                <div className="text-lg font-semibold">${getCartTotal().toFixed(2)}</div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCart(false)}>
                  <X className="mr-2" size={16} /> Close
                </Button>
                <Button
                  onClick={submitOrder}
                  disabled={
                    isSubmittingOrder ||
                    cart.some((ci) => {
                      const p = products.find((p) => p.product_id === ci.product_id)
                      return !p || !p.vendors || p.vendors.length === 0
                    })
                  }
                >
                  Submit Order
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Product Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={(open) => (open ? setDetailsOpen(true) : closeProductDetails())}>
        <DialogContent className="max-w-xl">
          {detailsProduct && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>{detailsProduct.display_name}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const url = `${window.location.origin}${window.location.pathname}#catalog/${detailsProduct.product_id}`
                      try {
                        await navigator.clipboard.writeText(url)
                        toast.success('Product link copied')
                      } catch {
                        toast.error('Failed to copy link')
                      }
                    }}
                    aria-label="Copy product link"
                  >
                    <LinkSimple size={14} /> Copy link
                  </Button>
                </DialogTitle>
                <DialogDescription>{detailsProduct.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">SKU</span>
                  <span className="font-medium">{detailsProduct.sku}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pack Qty</span>
                  <span className="font-medium">{detailsProduct.pack_quantity}</span>
                </div>
                {detailsProduct.requires_dm_approval && (
                  <Badge variant="outline" className="text-xs">
                    <Warning size={12} className="mr-1" /> Requires Approval
                  </Badge>
                )}
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Vendors</div>
                  {detailsProduct.vendors && detailsProduct.vendors.length > 0 ? (
                    <div className="space-y-2">
                      {detailsProduct.vendors.map((v) => (
                        <div key={v.vendor_id} className="flex items-center justify-between">
                          <span>{v.vendor_name}</span>
                          <span className="text-sm">${v.cost_per_item.toFixed(2)} {v.is_preferred && <Badge className="ml-2" variant="secondary">Preferred</Badge>}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">No vendors available</div>
                  )}
                </div>
                <div className="pt-2">
                  <Button onClick={() => addToCart(detailsProduct)}>
                    <Plus className="mr-2" size={16} /> Add to Cart
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ProductCard({
  product,
  onAddToCart,
  onOpenDetails,
}: {
  product: Product
  onAddToCart: (product: Product, quantity?: number) => void
  onOpenDetails: (product: Product) => void
}) {
  const preferredVendor = product.vendors.find((v) => v.is_preferred) || product.vendors[0]
  if (!preferredVendor) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            <button
              onClick={() => onOpenDetails(product)}
              className="underline-offset-4 hover:underline text-left"
            >
              {product.display_name}
            </button>
          </CardTitle>
          <CardDescription>No vendor available</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">
              <button
                onClick={() => onOpenDetails(product)}
                className="underline-offset-4 hover:underline text-left"
              >
                {product.display_name}
              </button>
            </CardTitle>
            <CardDescription>{product.description}</CardDescription>
          </div>
          {product.requires_dm_approval && (
            <Badge variant="outline" className="ml-2">Requires Approval</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Price:</span>
            <span className="font-medium">${preferredVendor.cost_per_item.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pack Qty:</span>
            <span className="font-medium">{product.pack_quantity}</span>
          </div>
          {preferredVendor.lead_time_days != null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Lead Time:</span>
              <span className="font-medium">{preferredVendor.lead_time_days} days</span>
            </div>
          )}
        </div>
        <div className="mt-4">
          <Button onClick={() => onAddToCart(product)} aria-label={`Add ${product.display_name} to cart`}>
            <Plus className="mr-2" size={16} /> Add to Cart
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}















