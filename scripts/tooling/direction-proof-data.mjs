// Only imported by the isolated fixture when its explicit proof flag is enabled.
// No real pack/photo, patient, medical instructions or provider integration.
export function proofFamily(product, category) {
  const common = {
    ...product,
    name: "Synthetic option family — not for sale",
    category,
    brand: "Layout Sample",
    familyKey: "proof-options",
    familyName: "Synthetic option family",
    familyBrand: "Layout Sample",
    familyForm: "Layout sample",
    familyStrength: "not applicable",
    sale: false,
    salePrice: undefined,
    description:
      "Synthetic nonmedical layout data. No product or service claim.",
    images: ["proof-image-a.png", "proof-image-b.png"],
  };
  return [
    {
      ...common,
      _id: "dddddddddddddddddddddd01",
      product_id: "PD9901",
      variantSize: "Small",
      price: 30,
      stock: 4,
    },
    {
      ...common,
      _id: "dddddddddddddddddddddd02",
      product_id: "PD9902",
      variantSize: "Large",
      price: 35,
      stock: 0,
    },
  ];
}
