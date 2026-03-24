/**
 * Feature flags — flip any value to true to enable that section.
 * Changes here automatically affect navigation visibility and route access.
 */
const features = {
  purchaseOrders: true,
  workOrders: true,
  vendors: true,
} as const;

export default features;
