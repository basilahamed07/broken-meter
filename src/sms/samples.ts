/** Realistic (anonymised) Indian bank/UPI SMS used by the parser tests. amount is in paise. */
export interface Sample { name: string; sender: string; body: string; expect: null | { amount: number; payee: string } }

export const SAMPLES: Sample[] = [
  { name: 'SBI UPI debit', sender: 'AX-SBIUPI', body: 'Dear UPI user A/C X1234 debited by 450.0 on date 12Jun26 trf to SWIGGY Refno 123456789012. If not u? call 1800111109. -SBI', expect: { amount: 45000, payee: 'SWIGGY' } },
  { name: 'SBI credit card', sender: 'VK-SBICRD', body: 'Rs.1,299.00 spent on your SBI Credit Card ending 1234 at AMAZON on 12-06-26. Trxn. not done by you? Report immediately at 1800 1234.', expect: { amount: 129900, payee: 'AMAZON' } },
  { name: 'HDFC UPI sent', sender: 'AD-HDFCBK', body: 'Sent Rs.250.00 From HDFC Bank A/C *1234 To ZOMATO On 12/06/26 Ref 123456789012 Not You? Call 18002586161', expect: { amount: 25000, payee: 'ZOMATO' } },
  { name: 'HDFC card spend', sender: 'AD-HDFCBK', body: 'Rs 3,450.00 spent on HDFC Bank Card x1234 At BIG BAZAAR On 2026-06-12:14:22:10.Not You? Call 18002586161', expect: { amount: 345000, payee: 'BIG BAZAAR' } },
  { name: 'ICICI account debit', sender: 'JD-ICICIB', body: 'ICICI Bank Acct XX123 debited for Rs 600.00 on 12-Jun-26; BIGBASKET credited. UPI:123456789012. Call 18002662 for dispute.', expect: { amount: 60000, payee: 'BIGBASKET' } },
  { name: 'ICICI credit card', sender: 'JD-ICICIB', body: 'Your ICICI Bank Credit Card XX4321 has been used for a transaction of INR 1,200.00 on 12-Jun-26 at UBER INDIA. Avl Lmt: INR 45,000.00.', expect: { amount: 120000, payee: 'UBER INDIA' } },
  { name: 'Axis UPI P2M', sender: 'AX-AXISBK', body: 'INR 99.00 debited from A/c no. XX1234 on 12-06-26 07:15:00 UPI/P2M/123456789012/RAPIDO Not you? SMS BLOCK UPI to 919951860002', expect: { amount: 9900, payee: 'RAPIDO' } },
  { name: 'Axis card spent', sender: 'AX-AXISBK', body: 'Spent Card no. XX1234 INR 749 12-06-26 18:22:10 MYNTRA Avl Lmt INR 50,000 If not you? SMS BLOCK 1234 to 919951860002', expect: { amount: 74900, payee: 'MYNTRA' } },
  { name: 'Kotak UPI to VPA', sender: 'VM-KOTAKB', body: 'Sent Rs.500.00 from Kotak Bank AC X1234 to arun@okhdfcbank on 12-06-26.UPI Ref 123456789012. Not you, https://kotak.com/KBANKT/Fraud', expect: { amount: 50000, payee: 'arun@okhdfcbank' } },
  { name: 'Kotak card', sender: 'VM-KOTAKB', body: 'Your Kotak Credit Card XX1234 was used for Rs. 2,100.00 at DECATHLON on 12-JUN-2026. Not you? Call 1860 266 2666.', expect: { amount: 210000, payee: 'DECATHLON' } },
  { name: 'Indian Bank UPI', sender: 'AD-INDBNK', body: 'A/c *1234 debited Rs. 120.00 on 12-06-2026 & credited to NAGARAJ via UPI Ref No 123456789012. Call 1800 425 00000 for dispute. -Indian Bank', expect: { amount: 12000, payee: 'NAGARAJ' } },
  { name: 'IOB debit', sender: 'VK-IOBCHN', body: 'Your a/c no. XXXXX1234 is debited for Rs.300.00 on 12-06-26 and a/c XXXXX5678 credited (UPI Ref no 123456789012). -IOB', expect: { amount: 30000, payee: '' } },
  { name: 'GPay style paid', sender: 'GPAY', body: 'Paid ₹80 to Murugan Tea Stall using Bank account. UPI Ref: 123456789012', expect: { amount: 8000, payee: 'Murugan Tea Stall' } },
  { name: 'Paytm paid', sender: 'PAYTM', body: 'Paid Rs.350 to Swiggy via Paytm UPI. Txn ID 12345', expect: { amount: 35000, payee: 'Swiggy' } },
  { name: 'Canara VPA', sender: 'CP-CANBNK', body: 'Rs 1,000.00 debited from account XX1234 towards VPA mohan@ybl (MOHAN K) on 12-06-26.', expect: { amount: 100000, payee: 'mohan@ybl' } },
  { name: 'ATM withdrawal', sender: 'AD-HDFCBK', body: 'Rs 2,000 withdrawn from HDFC Bank ATM on 12-06-26 using Card x1234. Avl Bal Rs 9,500.', expect: { amount: 200000, payee: 'ATM withdrawal' } },
  // ---- must be ignored ----
  { name: 'OTP', sender: 'AX-SBIUPI', body: '123456 is your OTP for txn of Rs 450 at AMAZON. Do not share it with anyone.', expect: null },
  { name: 'Credit', sender: 'AD-HDFCBK', body: 'Rs 5,000.00 credited to your A/c XX1234 on 12-06-26 by UPI from RAHUL. Avl bal Rs 9,000.00', expect: null },
  { name: 'Refund', sender: 'JD-ICICIB', body: 'Refund of Rs 450 for your order has been credited to your account XX1234.', expect: null },
  { name: 'Failed txn', sender: 'AX-AXISBK', body: 'Your UPI txn of Rs 200 to SWIGGY failed. Amount not debited from A/c XX1234.', expect: null },
  { name: 'Promo', sender: 'VM-PROMO', body: 'Get 50% off on your first order! Pay Rs 99 only. Offer valid till 30 Jun. Apply now', expect: null },
  { name: 'Balance only', sender: 'AD-HDFCBK', body: 'Avl bal in A/c XX1234 is Rs 1,200.00 as on 12-06-26.', expect: null },
  { name: 'Card bill due', sender: 'VK-SBICRD', body: 'Payment of Rs 4,500 is due on 25-06-26 for your SBI Card. Min amount due Rs 225.', expect: null },
];
