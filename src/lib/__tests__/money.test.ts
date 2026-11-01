import { formatRupees, groupIndian, parseAmountToPaise } from '../money';
it('groups indian', () => {
  expect(groupIndian(1234567)).toBe('12,34,567');
  expect(groupIndian(999)).toBe('999');
  expect(groupIndian(20000)).toBe('20,000');
});
it('formats paise', () => {
  expect(formatRupees(350_00)).toBe('₹350');
  expect(formatRupees(1234_50)).toBe('₹1,234.50');
  expect(formatRupees(-200_00)).toBe('-₹200');
});
it('parses', () => {
  expect(parseAmountToPaise('1,200')).toBe(120000);
  expect(parseAmountToPaise('abc')).toBe(0);
});
