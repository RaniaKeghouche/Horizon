const fs = require('fs');

const update = (path, trans) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  Object.assign(data.about, trans);
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
};

update('./src/locales/en.json', {
  c4_title: "Innovative Curriculum",
  c4_desc: "Modern teaching methodologies that equip students with future-ready skills and critical thinking.",
  c5_title: "Modern Facilities",
  c5_desc: "A state-of-the-art campus designed to foster creativity, collaboration, and academic growth.",
  c6_title: "Nurturing Community",
  c6_desc: "A supportive and inclusive environment where every student is valued and encouraged to thrive."
});

update('./src/locales/fr.json', {
  c4_title: "Programme Innovant",
  c4_desc: "Des méthodes d'enseignement modernes qui dotent les étudiants de compétences d'avenir et d'esprit critique.",
  c5_title: "Infrastructures Modernes",
  c5_desc: "Un campus à la pointe de la technologie conçu pour favoriser la créativité, la collaboration et la croissance.",
  c6_title: "Communauté Bienveillante",
  c6_desc: "Un environnement inclusif et favorable où chaque étudiant est valorisé et encouragé à s'épanouir."
});

update('./src/locales/ar.json', {
  c4_title: "مناهج مبتكرة",
  c4_desc: "طرق تدريس حديثة تزود الطلاب بمهارات المستقبل والتفكير النقدي.",
  c5_title: "مرافق حديثة",
  c5_desc: "حرم جامعي متطور مصمم لتعزيز الإبداع والتعاون والنمو الأكاديمي.",
  c6_title: "مجتمع داعم",
  c6_desc: "بيئة داعمة وشاملة يتم فيها تقدير كل طالب وتشجيعه على الازدهار."
});

console.log('Added more reasons successfully');
