const fs = require('fs');

const fixName = (path, title) => {
  const data = JSON.parse(fs.readFileSync(path, 'utf8'));
  
  if (data.app) data.app.name = "Horizon Skills Academy";
  
  if (data.about) {
    data.about.title = title;
  }
  
  fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
};

fixName('./src/locales/en.json', "Who is Horizon Skills Academy?");
fixName('./src/locales/fr.json', "Qui est Horizon Skills Academy ?");
fixName('./src/locales/ar.json', "من هي Horizon Skills Academy؟");

console.log("Fixed school names.");
