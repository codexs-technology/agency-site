/** Publication authorized by the owner; no independent document inspection claimed. */
export const businessAddress = {
  draft:
    "Plot No. 1/1, Near Ghazi Overseas Employment Pakistan, Nursery, PECHS Block 6, Shahrah-e-Faisal, Karachi, Pakistan.",
  documentMatchedAddress: "",
  documentReference: "",
  ownerApprovalReference: "",
  ownerConfirmedAddress: "Plot No. 1/1, Near Ghazi Overseas Employment Pakistan, Nursery, PECHS Block 6, Shahrah-e-Faisal, Karachi, Pakistan.",
  publicationApprovalReference: "Owner Phase 3 instruction, 2026-10-23",
  independentlyDocumentVerified: false,
};
export function approvedBusinessAddress() {
  return businessAddress.publicationApprovalReference.trim() &&
    businessAddress.ownerConfirmedAddress.trim()
    ? businessAddress.ownerConfirmedAddress.trim()
    : "";
}
