import { categorize, ruleCategory } from '../pipeline';
import { confidentPrediction, newModel, predict, tokenize, train } from '../naiveBayes';
import { normalizePayee } from '../memory';

const cats = [
  { id: 1, name: 'Groceries' }, { id: 2, name: 'Food' }, { id: 3, name: 'Travel' },
  { id: 4, name: 'Shopping' }, { id: 5, name: 'Bills' }, { id: 6, name: 'Others' },
];

describe('naive bayes', () => {
  const m = newModel();
  ['swiggy biryani', 'zomato dinner', 'swiggy lunch', 'dominos pizza'].forEach((t) => train(m, t, 2));
  ['dmart weekly', 'bigbasket veggies', 'dmart milk'].forEach((t) => train(m, t, 1));
  ['uber airport', 'ola cab', 'rapido bike'].forEach((t) => train(m, t, 3));

  it('tokenizes', () => expect(tokenize('Swiggy*Order 12345 Biryani!')).toEqual(['swiggy', 'order', 'biryani']));
  it('predicts trained categories', () => {
    expect(predict(m, 'swiggy dinner')!.categoryId).toBe(2);
    expect(predict(m, 'dmart groceries')!.categoryId).toBe(1);
    expect(predict(m, 'uber')!.categoryId).toBe(3);
  });
  it('probabilities sum to 1', () => {
    const p = predict(m, 'swiggy')!;
    expect(p.ranked.reduce((a, r) => a + r.p, 0)).toBeCloseTo(1);
  });
  it('unknown tokens -> null', () => expect(predict(m, 'zzzz qqqq')).toBeNull());
  it('needs a few labels before it speaks up', () => {
    const tiny = newModel();
    train(tiny, 'swiggy', 2);
    expect(confidentPrediction(tiny, 'swiggy')).toBeNull();
  });
  it('is confident on clear signal, not on ambiguous', () => {
    const clear = newModel();
    for (let i = 0; i < 6; i++) train(clear, 'swiggy order', 2);
    for (let i = 0; i < 3; i++) train(clear, 'uber ride', 3);
    expect(confidentPrediction(clear, 'swiggy')).not.toBeNull();
    const amb = newModel();
    ['alpha one', 'alpha two', 'alpha three'].forEach((t) => train(amb, t, 1));
    ['alpha four', 'alpha five', 'alpha six'].forEach((t) => train(amb, t, 2));
    expect(confidentPrediction(amb, 'alpha')).toBeNull();
  });
  it('learns after every label', () => {
    const l = newModel();
    for (let i = 0; i < 3; i++) train(l, 'murugan tea stall', 2);
    train(l, 'sri hardware', 5);
    expect(predict(l, 'murugan tea')!.categoryId).toBe(2);
  });
});

describe('rules', () => {
  it('maps to closest user category', () => {
    expect(ruleCategory('Swiggy', cats)).toBe(2);
    expect(ruleCategory('DMART', cats)).toBe(1);
    expect(ruleCategory('Rapido ride', cats)).toBe(3);
    expect(ruleCategory('Amazon', cats)).toBe(4);
    expect(ruleCategory('Airtel recharge', cats)).toBe(5);
  });
  it('skips when the user has no matching category', () => {
    expect(ruleCategory('Swiggy', [{ id: 9, name: 'Pets' }])).toBeNull();
  });
  it('short keywords need whole words', () => {
    expect(ruleCategory('Violet Salon', cats)).toBeNull(); // contains "vi" and "ola"-like substrings
    expect(ruleCategory('Vi recharge', cats)).toBe(5);
  });
});

describe('pipeline order', () => {
  const model = newModel();
  const memory = (n: string) => (n === 'swiggy' ? 6 : null);
  it('exact memory beats rules', () => {
    const r = categorize({ payee: 'SWIGGY' }, { categories: cats, memory, model });
    expect(r).toMatchObject({ categoryId: 6, source: 'memory' });
  });
  it('rules next', () => {
    expect(categorize({ payee: 'Zomato' }, { categories: cats, memory, model })).toMatchObject({ categoryId: 2, source: 'rules' });
  });
  it('learner when confident', () => {
    const m = newModel();
    for (let i = 0; i < 4; i++) train(m, 'murugan tea stall', 2);
    expect(categorize({ payee: 'Murugan Tea' }, { categories: cats, memory: () => null, model: m })).toMatchObject({ categoryId: 2, source: 'learner' });
  });
  it('asks when unsure and offers top 3', () => {
    const r = categorize({ payee: 'Arun' }, { categories: cats, memory: () => null, model });
    expect(r.categoryId).toBeNull();
    expect(r.top3).toHaveLength(3);
  });
});

describe('normalizePayee', () => {
  it('collapses variants', () => {
    expect(normalizePayee('SWIGGY*ORDER 123456')).toBe(normalizePayee('swiggy order'));
    expect(normalizePayee('arun@okhdfcbank')).toBe('arun');
  });
});
