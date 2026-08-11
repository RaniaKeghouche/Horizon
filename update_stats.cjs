const fs = require('fs');

const enPath = './src/locales/en.json';
const frPath = './src/locales/fr.json';
const arPath = './src/locales/ar.json';

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
en.hero.stat1_label = "Experience";
en.hero.stat1_val = "4+ Years";
en.hero.stat2_label = "Students";
en.hero.stat2_val = "100+";
en.hero.stat3_label = "Success Rate";
en.hero.stat3_val = "90%";
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');

const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
fr.hero.stat1_label = "Expérience";
fr.hero.stat1_val = "4+ Ans";
fr.hero.stat2_label = "Étudiants";
fr.hero.stat2_val = "100+";
fr.hero.stat3_label = "Réussite";
fr.hero.stat3_val = "90%";
fs.writeFileSync(frPath, JSON.stringify(fr, null, 2), 'utf8');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
ar.hero.stat1_label = "خبرة";
ar.hero.stat1_val = "+4 سنوات";
ar.hero.stat2_label = "طالب";
ar.hero.stat2_val = "+100";
ar.hero.stat3_label = "نسبة النجاح";
ar.hero.stat3_val = "90%";
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');

console.log('Stats updated successfully');
