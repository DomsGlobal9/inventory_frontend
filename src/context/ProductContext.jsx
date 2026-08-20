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
    selectedSizes: [], // e.g. ["S", "M"]
    selectedColors: [], // e.g. ["red_#FF0000", "blue_#0000FF"]
    units: {}, // e.g. { "red_#FF0000": { "S": 10, "M": 5 } }
    
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
