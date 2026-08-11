const fs = require('fs');

const update = (path, trans) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  data.contact = trans;
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
};

update('./src/locales/en.json', {
  title: "Contact Us",
  phone: "(+212) 600-000000",
  email: "contact@horizon.edu",
  location: "Casablanca, Morocco",
  social: "@horizon_academy",
  form_title: "Information ? Send Us a Message",
  form_desc: "Feel free to reach out to us for any inquiries about our programs, admissions, or general information. We are here to help!",
  follow: "Follow Us On Social Media:",
  submit: "Submit Message",
  lbl_email: "Email",
  lbl_name: "Name",
  lbl_subject: "Subject",
  lbl_message: "Message"
});

update('./src/locales/fr.json', {
  title: "Contactez-nous",
  phone: "(+212) 600-000000",
  email: "contact@horizon.edu",
  location: "Casablanca, Maroc",
  social: "@horizon_academy",
  form_title: "Des Informations ? Envoyez-nous un Message",
  form_desc: "N'hésitez pas à nous contacter pour toute question concernant nos programmes, les admissions ou des informations générales. Nous sommes là pour vous aider !",
  follow: "Suivez-nous sur les réseaux sociaux :",
  submit: "Envoyer le message",
  lbl_email: "E-mail",
  lbl_name: "Nom",
  lbl_subject: "Sujet",
  lbl_message: "Message"
});

update('./src/locales/ar.json', {
  title: "اتصل بنا",
  phone: "(+212) 600-000000",
  email: "contact@horizon.edu",
  location: "الدار البيضاء، المغرب",
  social: "@horizon_academy",
  form_title: "معلومات؟ أرسل لنا رسالة",
  form_desc: "لا تتردد في التواصل معنا لأي استفسار حول برامجنا أو القبول أو المعلومات العامة. نحن هنا للمساعدة!",
  follow: "تابعنا على وسائل التواصل الاجتماعي:",
  submit: "إرسال رسالة",
  lbl_email: "البريد الإلكتروني",
  lbl_name: "الاسم",
  lbl_subject: "الموضوع",
  lbl_message: "الرسالة"
});

console.log('Added contact strings successfully');
