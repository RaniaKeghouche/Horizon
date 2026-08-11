const fs = require('fs');

const update = (path, trans) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.about = trans;
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
};

update('./src/locales/en.json', {
  title: "Who is Horizon Skills Academy?",
  c1_title: "A School of Excellence",
  c1_desc: "A powerful and prestigious academy dedicated to unlocking every student's full potential through innovative learning.",
  c2_title: "Qualified Teachers",
  c2_desc: "Learn from elite, passionate educators who are committed to providing the highest standard of academic guidance.",
  c3_title: "Proven Success",
  c3_desc: "A consistent history of top-tier results and unleashed potential."
});

update('./src/locales/fr.json', {
  title: "Qui sommes-nous ?",
  c1_title: "Une École d'Excellence",
  c1_desc: "Une académie prestigieuse dédiée à libérer le plein potentiel de chaque étudiant grâce à un apprentissage innovant.",
  c2_title: "Enseignants Qualifiés",
  c2_desc: "Apprenez avec des éducateurs d'élite, passionnés et engagés à fournir le plus haut niveau d'encadrement académique.",
  c3_title: "Succès Prouvé",
  c3_desc: "Un historique constant de résultats de premier plan et de potentiel libéré."
});

update('./src/locales/ar.json', {
  title: "من هي أكاديمية آفاق للمهارات؟",
  c1_title: "مدرسة التميز",
  c1_desc: "أكاديمية قوية ومرموقة مكرسة لإطلاق الإمكانات الكاملة لكل طالب من خلال التعلم المبتكر.",
  c2_title: "معلمون مؤهلون",
  c2_desc: "تعلم من نخبة من المعلمين الشغوفين الملتزمين بتقديم أعلى مستويات التوجيه الأكاديمي.",
  c3_title: "نجاح مثبت",
  c3_desc: "تاريخ حافل من النتائج المتفوقة وإطلاق العنان للقدرات."
});

console.log('About translations updated successfully');
