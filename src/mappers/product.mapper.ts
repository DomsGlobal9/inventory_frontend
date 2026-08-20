export const mapProductFormToApiPayload = (formData: any) => {
  // Convert friendly UI names/formats into strict API ENUMs and types
  
  // Example: "Ready to Wear" -> "READY_TO_WEAR"
  const productTypeMap: Record<string, string> = {
    'Ready to Wear': 'READY_TO_WEAR',
    'Custom Made': 'CUSTOM',
  };

  return {
    title: formData.title,
    productCode: formData.productCode || `SE-${Math.floor(Math.random() * 10000)}`, // Fallback if missing
    description: formData.description,
    category: formData.category?.toUpperCase() || 'WOMEN',
    productType: productTypeMap[formData.productType] || 'READY_TO_WEAR',
    dressType: formData.dressType,
    fabric: formData.fabric,
    craft: formData.craft,
    brand: formData.brand,
    basePrice: Number(formData.price) || 0,
    status: formData.isPublished ? 'ACTIVE' : 'DRAFT'
  };
};

export const mapApiProductToForm = (apiData: any) => {
  // Translate back for the UI Wizard
  const typeReverseMap: Record<string, string> = {
    'READY_TO_WEAR': 'Ready to Wear',
    'CUSTOM': 'Custom Made',
  };

  return {
    ...apiData,
    price: apiData.basePrice.toString(),
    productType: typeReverseMap[apiData.productType] || 'Ready to Wear',
    isPublished: apiData.status === 'ACTIVE'
  };
};
