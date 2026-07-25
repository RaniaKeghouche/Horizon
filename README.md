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

## Mode démo (par défaut)

Tant qu'aucune clé Firebase n'est fournie, l'app tourne en **mode démo** : toutes les
données vivent dans un store local (localStorage) pré-rempli de données réalistes. On
peut donc tout tester immédiatement — se connecter en tant qu'admin / prof / étudiant,
inscrire des élèves, construire l'emploi du temps, pointer la présence, encaisser des
paiements, générer des factures — **sans backend**. Remplir `.env` bascule
automatiquement sur Firebase (`DEMO_MODE` dans [src/lib/config.ts](src/lib/config.ts)).

## Démarrage

```bash
npm install
npm run dev               # frontend web sur http://localhost:1420 (mode démo)
npm run tauri dev         # app desktop native

# Pour brancher Firebase :
cp .env.example .env      # remplir avec la config Firebase
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

- [x] **P1** Projet + structure
- [x] **P2** Auth + 3 rôles + routing protégé *(règles Firestore fournies)*
- [x] **P3** Schéma + types TypeScript + store local
- [x] **P4** Gestion étudiants / enseignants / matières (formulaires + enrôlement + filtres)
- [x] **P5** Emploi du temps — grille free-slot complète (add/edit/déplacer/supprimer, conflits, capacité)
- [x] **P6** Présence (3 états, historique, notif parent en démo)
- [x] **P7** Moteur de paiement (%/fixe, dette par séance, séance X/Y, relances, facture PDF)
- [x] **P10** Notifications in-app (digest quotidien, relances, demandes de créneaux)
- [ ] **P8** Synchro Google Sheets (6 onglets) — *à faire au déploiement*
- [ ] **Firebase** brancher Firestore/Auth/FCM réels (remplacer le store démo)
- [ ] **P9** Build mobile → **Tauri mobile** (Android/iOS)
- [ ] **P11** Déploiement + PWA + APK Android

Tout ce qui est coché fonctionne **dès maintenant** en mode démo.

## Prochaine étape

Créer le projet Firebase, remplir `.env`, écrire la couche de sync Firestore ↔ store,
déployer `firestore.rules`, puis Google Sheets + build mobile.
