// i18n — Arabic (RTL) is the default/primary language per the cahier des charges.
// The document direction is switched automatically when the language changes.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "../locales/ar.json";
import fr from "../locales/fr.json";
import en from "../locales/en.json";

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
    en: { translation: en },
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

/**
 * Les trois langues de l'application, dans l'ordre d'affichage.
 *
 * Elles etaient jusqu'ici declarees uniquement sur la page publique, et les
 * coquilles de l'application basculaient entre l'arabe et le francais avec un
 * simple `language === "ar" ? "fr" : "ar"`. Consequence : une fois connecte,
 * l'anglais devenait inatteignable, alors que sa traduction est complete.
 */
export const LANGUAGES = [
  { code: "ar", label: "العربية", short: "AR" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "en", label: "English", short: "EN" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
