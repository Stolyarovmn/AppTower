export function evaluatePerformanceGate({medianMs, p95Ms}, {medianLimitMs, p95LimitMs}) {
  if (medianMs > medianLimitMs) {
    return {pass:false, confirm:false, reason:"median"};
  }
  if (p95Ms > p95LimitMs) {
    return {pass:false, confirm:true, reason:"p95"};
  }
  return {pass:true, confirm:false, reason:null};
}

export function confirmPerformanceGate(first, second, limits) {
  const firstResult = evaluatePerformanceGate(first, limits);
  if (firstResult.pass || !firstResult.confirm) return firstResult;

  const secondResult = evaluatePerformanceGate(second, limits);
  if (secondResult.pass) {
    return {pass:true, confirm:false, reason:"transient-p95"};
  }
  return {pass:false, confirm:false, reason:secondResult.reason};
}
