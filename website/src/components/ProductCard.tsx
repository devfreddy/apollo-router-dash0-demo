interface Product {
  id: string
  name: string
  price: number
  description?: string
  category?: string
  inStock: boolean
}

interface ProductCardProps {
  product: Product
  onViewInventory: (product: Product) => void
}

export default function ProductCard({ product, onViewInventory }: ProductCardProps) {
  return (
    <div className="product-card">
      <div className="product-image">
        {/* Generate a simple emoji-based product image */}
        {getProductEmoji(product.category)}
      </div>
      <div className="product-content">
        <div className="product-category">{product.category || 'Uncategorized'}</div>
        <div className="product-name">{product.name}</div>
        <div className="product-description">{product.description}</div>
        <div className="product-price">${product.price.toFixed(2)}</div>
        <div className="product-footer">
          <span className={`stock-status ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
            {product.inStock ? '✓ In Stock' : '✗ Out of Stock'}
          </span>
          <button
            className="view-inventory"
            onClick={() => onViewInventory(product)}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  )
}

function getProductEmoji(category?: string): string {
  const emojiMap: Record<string, string> = {
    electronics: '📱',
    home: '🏠',
    clothing: '👕',
    books: '📚',
    sports: '⚽',
    toys: '🧸',
    furniture: '🪑',
    outdoor: '🏕️',
    kitchen: '🍳',
    tools: '🔧',
  }

  const normalizedCategory = (category || 'products').toLowerCase()
  return emojiMap[normalizedCategory] || '📦'
}
