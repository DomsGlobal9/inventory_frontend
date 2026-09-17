/**
 * What to say when a role does not reach a screen.
 *
 * The guard used to say the same sentence everywhere -- "This part of the app isn't part of your
 * role" -- while each screen had its own, friendlier wording written for it (and printed in the
 * guide): "You cannot pick orders", "You cannot count shelves". Those sentences were unreachable,
 * because the guard answers first. So the guard says them instead.
 *
 * `ask` is per permission, because that is what the owner actually switches on; the heading is per
 * screen, because "you cannot pick orders" is what the person in front of the screen wanted to do.
 */
const ASK = {
  'shelf:putaway': 'Ask whoever manages your team for the permission to put stock away and move it.',
  'shelf:view': 'Ask whoever manages your team for the permission to see the shelves.',
  'shelf:manage': 'Ask whoever manages your team for the permission to set up racks and shelves.',
  'inventory:view': 'Ask whoever manages your team for the permission to see stock.',
  'inventory:adjust': 'Ask whoever manages your team for the permission to change stock.',
  'inventory:transfer': 'Ask whoever manages your team for the permission to move stock between stores.',
  'stock_count:view': 'Ask whoever manages your team for the permission to work with stock counts.',
  'product:view': 'Ask whoever manages your team for the permission to see products.',
  'product:create': 'Ask whoever manages your team for the permission to add products.',
  'sales_order:view': 'Ask whoever manages your team for the permission to see orders.',
  'sales_order:counter_sale': 'Ask whoever manages your team for the permission to sell at the counter.',
  'purchase_order:view': 'Ask whoever manages your team for the permission to see purchase orders.',
  'purchase_order:create': 'Ask whoever manages your team for the permission to raise purchase orders.',
  'supplier:view': 'Ask whoever manages your team for the permission to see suppliers.',
  'customer:view': 'Ask whoever manages your team for the permission to see customers.',
  'offer:view': 'Ask whoever manages your team for the permission to see offers.',
  'offer:create': 'Ask whoever manages your team for the permission to make offers.',
  'return:view': 'Ask whoever manages your team for the permission to see returns.',
  'admin:locations': 'Ask the shop owner: only an owner or admin sets up stores and godowns.',
  'admin:users': 'Ask the shop owner: only an owner or admin manages the team.',
  'admin:roles': 'Ask the shop owner: only an owner or admin changes what each role can do.'
};

const GENERIC = "This part of the app isn't part of your role. Ask whoever manages your team if you need it.";

/** "pick orders" -> "You cannot pick orders". Without a phrase, the plain heading is used. */
export const noAccessTitle = (what) => (what ? `You cannot ${what}` : 'Not part of your role');

export const noAccessMessage = (permission) => ASK[permission] || GENERIC;
