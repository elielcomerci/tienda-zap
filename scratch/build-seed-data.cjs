const fs = require('fs');
const path = require('path');

const parsed = JSON.parse(fs.readFileSync(path.join(__dirname, 'parsed-matrix.json'), 'utf-8'));

// 1. Situations
const situationsCode = `import { SituationSeedData } from '../types';

export const situationsData: SituationSeedData[] = ${JSON.stringify(parsed.situations, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '../prisma/seed/data/03-situations.ts'), situationsCode);
console.log('Created 03-situations.ts');

// 2. Needs
const needsCode = `import { NeedSeedData } from '../types';

export const needsData: NeedSeedData[] = ${JSON.stringify(parsed.needs, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '../prisma/seed/data/04-needs.ts'), needsCode);
console.log('Created 04-needs.ts');

// 3. Offer Matrix
const offerMatrixCode = `import { OfferMatrixEntrySeedData } from '../types';

export const offerMatrixData: OfferMatrixEntrySeedData[] = ${JSON.stringify(parsed.tuples, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '../prisma/seed/data/07-offer-matrix.ts'), offerMatrixCode);
console.log('Created 07-offer-matrix.ts');
