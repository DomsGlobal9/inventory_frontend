import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomers } from '../../hooks/useCustomers';
import { useInventoryVariants } from '../../hooks/useInventory';
import { useCreateFullOrder } from '../../hooks/useSalesOrders';
import { ArrowLeft, Search, Plus, Trash2, User, Save, CheckCircle } from 'lucide-react';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  
  const [customerSearch, setCustomerSearch] = useState('');
  const { data: customers } = useCustomers();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    gstNumber: '',
    customerType: 'WALK_IN'
  });

  const [productSearch, setProductSearch] = useState('');
  const { data: inventoryData } = useInventoryVariants({ search: productSearch });
  const variants = inventoryData?.variants || [];
  
  const [cartItems, setCartItems] = useState([]);
  
  const createMutation = useCreateFullOrder();

  const handleAddProduct = (variant) => {
    const existing = cartItems.find(i => i.variantId === variant.id);
    if (existing) {
      setCartItems(cartItems.map(i => 
        i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setCartItems([...cartItems, { 
        variantId: variant.id, 
        sku: variant.sku,
        name: variant.product.title,
        price: Number(variant.sellingPrice || 0),
        available: variant.quantity - variant.reservedQty,
        quantity: 1
      }]);
    }
  };

  const handleUpdateQty = (variantId, delta) => {
    setCartItems(cartItems.map(i => {
      if (i.variantId === variantId) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const handleRemoveProduct = (variantId) => {
    setCartItems(cartItems.filter(i => i.variantId !== variantId));
  };

  const handleProductSearchKeyDown = (e) => {
    if (e.key === 'Enter' && productSearch.trim() !== '') {
      e.preventDefault();
      if (variants.length === 1) {
        handleAddProduct(variants[0]);
        setProductSearch('');
      } else if (variants.length === 0) {
        alert("No matching product found for this barcode/SKU.");
      }
    }
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = (status) => {
    if (!isNewCustomer && !selectedCustomerId) {
      alert("Please select a customer or create a new one.");
      return;
    }
    if (cartItems.length === 0) {
      alert("Please add at least one product to the order.");
      return;
    }

    let customerPayload = {};
    if (isNewCustomer) {
      customerPayload = {
        isNew: true,
        ...newCustomerData
      };
      // Name is required if type is REGISTERED, but we set a default in the backend if WALK_IN.
      if (!newCustomerData.name && newCustomerData.customerType === 'REGISTERED') {
         alert("Name is required for Registered customers.");
         return;
      }
    } else {
      customerPayload = {
        isNew: false,
        id: selectedCustomerId
      };
    }

    const payload = {
      customer: customerPayload,
      items: cartItems.map(i => ({ variantId: i.variantId, quantity: i.quantity })),
      status
    };

    createMutation.mutate(payload, {
      onSuccess: (newOrder) => {
        navigate(`/orders/${newOrder.id}`);
      }
    });
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '24px', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '64px', width: '100%', display: 'flex', flexDirection: 'column' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <button onClick={() => navigate('/orders')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: '32px', margin: 0, color: 'var(--text-primary)' }}>New Sales Order</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
        
        {/* Main Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Customer Section */}
          <div className="card">
            <h2 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={18} /> Customer Details
            </h2>
            
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <button 
                type="button" 
                className={!isNewCustomer ? "btn-primary" : "btn-secondary"} 
                onClick={() => setIsNewCustomer(false)}
              >
                Existing Customer
              </button>
              <button 
                type="button" 
                className={isNewCustomer ? "btn-primary" : "btn-secondary"} 
                onClick={() => setIsNewCustomer(true)}
              >
                <Plus size={16} style={{ marginRight: '4px' }} /> New Customer
              </button>
            </div>

            {!isNewCustomer ? (
              <div className="form-group">
                <label className="form-label">Search / Select Customer</label>
                <select 
                  className="input-field" 
                  value={selectedCustomerId} 
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">-- Choose Customer --</option>
                  {customers?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.customerCode})</option>
                  ))}
                </select>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Customer Type</label>
                  <select 
                    className="input-field"
                    value={newCustomerData.customerType}
                    onChange={(e) => setNewCustomerData({...newCustomerData, customerType: e.target.value})}
                  >
                    <option value="WALK_IN">Walk-in Customer (Minimal Info)</option>
                    <option value="REGISTERED">Registered Customer (Full Profile)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Name {newCustomerData.customerType === 'REGISTERED' ? '*' : ''}</label>
                  <input type="text" className="input-field" value={newCustomerData.name} onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})} placeholder={newCustomerData.customerType === 'WALK_IN' ? 'Walk-in Customer' : ''} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="text" className="input-field" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} />
                </div>
                {newCustomerData.customerType === 'REGISTERED' && (
                  <>
                    <div className="form-group">
                      <label className="form-label">Email</label>
                      <input type="email" className="input-field" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">GST Number</label>
                      <input type="text" className="input-field" value={newCustomerData.gstNumber} onChange={e => setNewCustomerData({...newCustomerData, gstNumber: e.target.value})} />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Add Products Section */}
          <div className="card">
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Order Items</h2>
            
            <div style={{ position: 'relative', marginBottom: '24px' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search Product by Name or SKU..." 
                className="input-field" 
                style={{ paddingLeft: '40px', width: '100%' }}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                onKeyDown={handleProductSearchKeyDown}
              />
              
              {productSearch && variants.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-color)', borderRadius: '8px', marginTop: '4px', zIndex: 10, maxHeight: '300px', overflowY: 'auto', boxShadow: 'var(--shadow-lg)' }}>
                  {variants.map(v => (
                    <div 
                      key={v.id} 
                      style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                      onClick={() => {
                        handleAddProduct(v);
                        setProductSearch('');
                      }}
                      className="table-row-hover"
                    >
                      <div>
                        <div style={{ fontWeight: 500 }}>{v.product?.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>SKU: {v.sku}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 500 }}>₹{v.sellingPrice}</div>
                          <div style={{ fontSize: '12px', color: (v.quantity - v.reservedQty) > 0 ? 'var(--success-color)' : 'var(--danger-color)' }}>
                            Available: {v.quantity - v.reservedQty}
                          </div>
                        </div>
                        <button className="btn-secondary" style={{ padding: '4px 8px' }}>Add</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart Table */}
            {cartItems.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <th style={{ padding: '12px', color: 'var(--text-secondary)' }}>Item</th>
                    <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '12px', color: 'var(--text-secondary)', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '12px', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cartItems.map(item => (
                    <tr key={item.variantId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{item.sku}</div>
                        {item.quantity > item.available && (
                          <div style={{ fontSize: '11px', color: 'var(--danger-color)' }}>Only {item.available} available</div>
                        )}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <button type="button" onClick={() => handleUpdateQty(item.variantId, -1)} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-light)', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>-</button>
                          <span style={{ width: '24px', textAlign: 'center' }}>{item.quantity}</span>
                          <button type="button" onClick={() => handleUpdateQty(item.variantId, 1)} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border-light)', borderRadius: '4px', width: '24px', height: '24px', cursor: 'pointer' }}>+</button>
                        </div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>₹{item.price.toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500 }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button type="button" onClick={() => handleRemoveProduct(item.variantId)} style={{ background: 'none', border: 'none', color: 'var(--danger-color)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--surface-hover)', borderRadius: '8px' }}>
                Search and add products to start the order
              </div>
            )}
          </div>

        </div>

        {/* Summary Right Column */}
        <div>
          <div className="card" style={{ position: 'sticky', top: '24px' }}>
            <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Summary</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              <span>Tax (0%)</span>
              <span>₹0.00</span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-light)', fontWeight: 'bold', fontSize: '18px' }}>
              <span>Total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button 
                type="button" 
                className="btn-primary" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px' }}
                onClick={() => handleSubmit('CONFIRMED')}
                disabled={createMutation.isPending || cartItems.length === 0}
              >
                <CheckCircle size={18} /> Confirm Order
              </button>
              
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px' }}
                onClick={() => handleSubmit('DRAFT')}
                disabled={createMutation.isPending || cartItems.length === 0}
              >
                <Save size={18} /> Save as Draft
              </button>
            </div>
            <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Confirming will automatically reserve inventory stock.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
