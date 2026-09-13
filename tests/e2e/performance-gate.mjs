export function evaluatePerformanceGate({medianMs, p95Ms}, {medianLimitMs, p95LimitMs}, {confirmMedian = false} = {}) {
  if (medianMs > medianLimitMs) {
    return {pass:false, confirm:confirmMedian, reason:"median"};
  }
  if (p95Ms > p95LimitMs) {
    return {pass:false, confirm:true, reason:"p95"};
  }
  return {pass:true, confirm:false, reason:null};
}

export function confirmPerformanceGate(first, second, limits, options = {}) {
  const firstResult = evaluatePerformanceGate(first, limits, options);
  if (firstResult.pass || !firstResult.confirm) return firstResult;

  const secondResult = evaluatePerformanceGate(second, limits, options);
  if (secondResult.pass) {
    return {pass:true, confirm:false, reason:`transient-${firstResult.reason}`};
  }
  return {pass:false, confirm:false, reason:secondResult.reason};
}
