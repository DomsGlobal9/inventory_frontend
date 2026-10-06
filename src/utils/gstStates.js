/**
 * GST state codes: the first two digits of every GSTIN, and what decides CGST+SGST against IGST.
 * The official list (GSTN), including the two non-state codes at the end.
 */
export const GST_STATES = [
  ['01', 'Jammu and Kashmir'], ['02', 'Himachal Pradesh'], ['03', 'Punjab'], ['04', 'Chandigarh'],
  ['05', 'Uttarakhand'], ['06', 'Haryana'], ['07', 'Delhi'], ['08', 'Rajasthan'], ['09', 'Uttar Pradesh'],
  ['10', 'Bihar'], ['11', 'Sikkim'], ['12', 'Arunachal Pradesh'], ['13', 'Nagaland'], ['14', 'Manipur'],
  ['15', 'Mizoram'], ['16', 'Tripura'], ['17', 'Meghalaya'], ['18', 'Assam'], ['19', 'West Bengal'],
  ['20', 'Jharkhand'], ['21', 'Odisha'], ['22', 'Chhattisgarh'], ['23', 'Madhya Pradesh'], ['24', 'Gujarat'],
  ['26', 'Dadra and Nagar Haveli and Daman and Diu'], ['27', 'Maharashtra'], ['29', 'Karnataka'], ['30', 'Goa'],
  ['31', 'Lakshadweep'], ['32', 'Kerala'], ['33', 'Tamil Nadu'], ['34', 'Puducherry'],
  ['35', 'Andaman and Nicobar Islands'], ['36', 'Telangana'], ['37', 'Andhra Pradesh'], ['38', 'Ladakh'],
  ['97', 'Other Territory'], ['99', 'Centre Jurisdiction']
];

export const gstStateName = (code) => GST_STATES.find(([c]) => c === code)?.[1] ?? null;

/** The state a GSTIN says it belongs to, or null while fewer than two digits have been typed. */
export const stateFromGstin = (gstin) => {
  const m = /^(\d{2})/.exec(String(gstin ?? '').trim());
  return m && gstStateName(m[1]) ? m[1] : null;
};
