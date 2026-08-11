const fs = require('fs');

const enPath = './src/locales/en.json';
const frPath = './src/locales/fr.json';
const arPath = './src/locales/ar.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
en.hero.title_start = "Shape Their ";
en.hero.title_dreams = "FUTURE";
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');

const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
fr.hero.title_start = "Façonnez Leur ";
fr.hero.title_dreams = "AVENIR";
fs.writeFileSync(frPath, JSON.stringify(fr, null, 2), 'utf8');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
ar.hero.title_start = "ارسم ";
ar.hero.title_dreams = "مستقبلهم";
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');

console.log('Hero titles updated successfully');
