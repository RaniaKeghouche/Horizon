// i18n — Arabic (RTL) is the default/primary language per the cahier des charges.
// The document direction is switched automatically when the language changes.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "../locales/ar.json";
import fr from "../locales/fr.json";

export const RTL_LANGUAGES = ["ar"];

export function applyDirection(lang: string) {
  const dir = RTL_LANGUAGES.includes(lang) ? "rtl" : "ltr";
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    fr: { translation: fr },
  },
  lng: localStorage.getItem("lang") ?? "ar",
  fallbackLng: "ar",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => {
  localStorage.setItem("lang", lng);
  applyDirection(lng);
});

applyDirection(i18n.language);

export default i18n;
