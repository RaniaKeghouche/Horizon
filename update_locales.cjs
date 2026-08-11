const fs = require('fs');

const heroEn = {
  title_start: "The journey from desk to ",
  title_dreams: "DREAMS",
  subtitle: "Empowering students through structured excellence and creative innovation.",
  stat1_label: "Established",
  stat1_val: "1998",
  stat2_label: "Pass Rate",
  stat2_val: "99%",
  stat3_label: "Student Ratio",
  stat3_val: "15:1"
};

const heroFr = {
  title_start: "De votre bureau vers vos ",
  title_dreams: "RÊVES",
  subtitle: "Accompagner les étudiants grâce à l'excellence structurée et à l'innovation créative.",
  stat1_label: "Fondé en",
  stat1_val: "1998",
  stat2_label: "Taux de réussite",
  stat2_val: "99%",
  stat3_label: "Ratio Étudiants",
  stat3_val: "15:1"
};

const heroAr = {
  title_start: "الرحلة من المكتب إلى ",
  title_dreams: "الأحلام",
  subtitle: "تمكين الطلاب من خلال التميز المنظم والابتكار الإبداعي.",
  stat1_label: "تأسست",
  stat1_val: "1998",
  stat2_label: "نسبة النجاح",
  stat2_val: "99%",
  stat3_label: "نسبة الطلاب",
  stat3_val: "15:1"
};

const frPath = './src/locales/fr.json';
const arPath = './src/locales/ar.json';
const enPath = './src/locales/en.json';

const fr = JSON.parse(fs.readFileSync(frPath, 'utf8'));
fr.hero = heroFr;
fs.writeFileSync(frPath, JSON.stringify(fr, null, 2), 'utf8');

const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
ar.hero = heroAr;
fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');

// Copy fr to en and replace with english
const en = JSON.parse(fs.readFileSync(frPath, 'utf8'));
en.hero = heroEn;
// translate nav just in case
en.nav = {
  dashboard: "Dashboard",
  schedule: "Schedule",
  payments: "Payments"
};
en.auth = {
  login: "Login"
};
en.login = {
  cta: "Get Started"
};
fs.writeFileSync(enPath, JSON.stringify(en, null, 2), 'utf8');
console.log('Locales updated successfully');
