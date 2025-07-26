export function getSuccessRate(level, fixedRates, baseRates) {
  if (fixedRates) {
    return fixedRates[level];
  }
  return baseRates[level];
}

export function binomial(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;

  let result = 1;
  for (let i = 1; i <= k; i++) {
    result *= (n - (k - i));
    result /= i;
  }
  return result;
}