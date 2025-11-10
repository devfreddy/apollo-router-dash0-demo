interface InventoryInfo {
  quantity: number
  warehouse: string
  estimatedDelivery: string
}

interface Product {
  id: string
  name: string
  price: number
  inStock: boolean
  inventory?: InventoryInfo
}

interface InventoryModalProps {
  product: Product
  onClose: () => void
}

export default function InventoryModal({ product, onClose }: InventoryModalProps) {
  return (
    <div className="modal active">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{product.name}</h2>
          <button className="close-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '1.1rem', marginBottom: '10px' }}>
            <strong>Price:</strong> ${product.price.toFixed(2)}
          </div>
          <div style={{ fontSize: '1.1rem' }}>
            <strong>Status:</strong>{' '}
            <span className={`stock-status ${product.inStock ? 'in-stock' : 'out-of-stock'}`}>
              {product.inStock ? '✓ In Stock' : '✗ Out of Stock'}
            </span>
          </div>
        </div>

        {product.inventory && (
          <div className="inventory-info">
            <h3 style={{ marginBottom: '15px' }}>Inventory Information</h3>
            <div className="inventory-row">
              <span className="inventory-label">Quantity Available:</span>
              <span className="inventory-value">{product.inventory.quantity} units</span>
            </div>
            <div className="inventory-row">
              <span className="inventory-label">Warehouse:</span>
              <span className="inventory-value">{product.inventory.warehouse}</span>
            </div>
            <div className="inventory-row">
              <span className="inventory-label">Estimated Delivery:</span>
              <span className="inventory-value">{product.inventory.estimatedDelivery}</span>
            </div>
          </div>
        )}

        <button
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            fontSize: '1rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginTop: '20px',
          }}
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  )
}
