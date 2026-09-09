import React, { createContext, useContext, useState } from 'react';

const ProductContext = createContext();

export const useProduct = () => useContext(ProductContext);

export const ProductProvider = ({ children }) => {
  const initialData = {
    // General Info
    title: '',
    description: '',
    category: 'WOMEN',
    productType: 'Ready to Wear',
    dressType: '',
    fabric: '',
    craft: '',
    brand: '',
    
    // Measurements / Pricing
    price: '',
    // What the stock cost. Asked for because not asking is what produced a shop holding 50
    // sarees the system believed were free -- the first purchase order was then averaged
    // against that zero and priced the saree at 98 rupees. Optional, because a shop that
    // genuinely does not know can leave it and correct it later.
    costPrice: '',
    // Who it was bought from. The supplier link used to be created only when a purchase
    // order was raised, so the Suppliers screen showed an empty item list for every supplier
    // until you had already ordered from them, and reordering could not suggest anyone.
    supplierId: '',
    selectedSizes: [], // e.g. ["S", "M"]
    selectedColors: [], // e.g. ["red_#FF0000", "blue_#0000FF"]
    units: {}, // e.g. { "red_#FF0000": { "S": 10, "M": 5 } }
    // Off by default: most shops sell every size of one saree at one price, and a grid of
    // price boxes nobody needs is a grid of boxes somebody mistypes. On, each colour/size
    // carries its own price -- which is real (a plus size or a zari border costs more).
    perVariantPricing: false,
    variantPrices: {}, // same shape as units: { "red_#FF0000": { "S": 1250 } }
    
    // Images
    images: {
      cover: null,
      additional: []
    }
  };

  const [productData, setProductData] = useState(initialData);

  const updateProductData = (key, value) => {
    setProductData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const loadProductForEdit = (product) => {
    setProductData(product);
  };

  const resetProductData = () => {
    setProductData(initialData);
  }

  return (
    <ProductContext.Provider value={{ productData, updateProductData, setProductData, loadProductForEdit, resetProductData }}>
      {children}
    </ProductContext.Provider>
  );
};
