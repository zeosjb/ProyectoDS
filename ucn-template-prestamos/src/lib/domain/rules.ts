export function canApproveLoan(availableQuantity: number, requestedQuantity: number, status: string) {
  return status === "pending" && requestedQuantity > 0 && availableQuantity >= requestedQuantity;
}

export function nextLoanStatus(current: string, action: "approve" | "reject" | "deliver" | "return" | "cancel") {
  const transitions: Record<string, string[]> = {
    pending: ["approve", "reject", "cancel"],
    approved: ["deliver"],
    delivered: ["return"],
    rejected: [],
    returned: [],
    overdue: ["return"],
    cancelled: []
  };
  return transitions[current]?.includes(action);
}
