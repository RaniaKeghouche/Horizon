# Horizon Skills Academy — School Management System

Application de gestion pour un centre de langues en Algérie (inscriptions, présence,
paiements, emploi du temps, synchro Google Sheets). Basée sur le cahier des charges v1.1.

## Stack (adaptée vers Tauri)

| Couche        | Techno                              | Rôle |
|---------------|-------------------------------------|------|
| Coquille app  | **Tauri 2** (Rust)                  | Desktop (admin) + Mobile iOS/Android (profs/étudiants) + PWA — un seul codebase |
| Frontend      | **React 19 + TypeScript + Vite**    | Toute l'UI |
| Données/Auth  | **Firebase** (Firestore + Auth)     | Temps réel, offline-first, rôles |
| Notifications | **Firebase FCM + WhatsApp**         | Push + relances |
| Backup        | **Google Sheets** (Apps Script)     | Miroir temps réel |
| i18n          | **i18next** — Arabe (RTL) d'abord   | + Français |

> Choix Tauri plutôt que Next.js + Flutter : un seul projet React/TS se compile à la
> fois en desktop et en mobile natif. Firebase est conservé pour le offline-first et
> l'auth par rôles.

## Démarrage

```bash
npm install
cp .env.example .env      # remplir avec la config Firebase
npm run dev               # frontend web sur http://localhost:1420
npm run tauri dev         # app desktop native
```

Pour le mobile (Android) : `npm run tauri android init` puis `npm run tauri android dev`.

## Structure

```
src/
  lib/                 # cœur non-UI
    firebase.ts        # init Firebase (Firestore offline + Auth + FCM)
    types.ts           # types de toutes les collections Firestore + noms de collections
    payments.ts        # calcul part école/prof (% ou fixe), facturation — pur, testable
    schedule.ts        # vérif créneaux libres (§5.2) — pur, testable
    i18n.ts            # config i18next, RTL auto
  locales/             # ar.json (défaut), fr.json
  features/            # une feature = un dossier
    auth/              # AuthContext (RBAC), LoginPage
    dashboard/         # accueil selon le rôle
    students/  teachers/  schedule/  attendance/  payments/  notifications/
  app/                 # coquille : AppLayout, ProtectedRoute, navigation par rôle
  components/          # UI partagée
  styles/              # global.css (thème simple, gros boutons, clair/sombre, RTL)
src-tauri/             # projet Rust/Tauri (config, icônes, capabilities)
firestore.rules        # règles de sécurité RBAC (§9)
```

## Feuille de route (mappée sur le cahier §10)

- [x] **P1** Projet + structure + Firebase connecté
- [x] **P2** Auth + 3 rôles + routing protégé *(règles Firestore fournies)*
- [x] **P3** Schéma Firestore + types TypeScript
- [~] **P5** Emploi du temps — grille free-slot (logique `checkSlot` faite, UI démo en place)
- [ ] **P4** Gestion étudiants / enseignants (formulaires + enrôlement)
- [ ] **P6** Présence (3 états, offline, notif parent)
- [ ] **P7** Moteur de paiement + relances + factures PDF
- [ ] **P8** Synchro Google Sheets (6 onglets)
- [ ] **P9** Build mobile → **Tauri mobile**
- [ ] **P10** Notifications (FCM, digest quotidien, relances)
- [ ] **P11** Déploiement + PWA + APK Android

## Prochaine étape

Créer un projet Firebase, remplir `.env`, déployer `firestore.rules`, puis attaquer
**P4** (formulaire d'inscription étudiant + flux d'enrôlement).
