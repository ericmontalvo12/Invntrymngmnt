/**
 * Feature flags — flip any value to true to enable that section.
 * Changes here automatically affect navigation visibility and route access.
 */
const features = {
  purchaseOrders: false,
  workOrders: false,
  vendors: false,
} as const;

export default features;
