# Checklist per la Distribuzione negli Store

Questo documento elenca i passaggi richiesti dalla base codebase attuale alle pubblicazioni sugli store principali per Silhouette CRM.

## 📱 Google Play (Android)
- [ ] Crea un Developer Account (Costo una-tantum $25).
- [ ] Stabilire il Package Name (già settato come `com.silhouette.crm`).
- [ ] Asset Fotografici:
  - Icona Hi-Res: 512x512 PNG, 32-bit.
  - Immagine in evidenza: 1024x500 JPEG/PNG.
  - Almeno 2-3 screenshot dal Web App (formati accettati: JPEG o PNG).
- [ ] Autenticazione e Links (Clerk/Supabase):
  - Verifica che Capacitor apra correttamente i link esterni per il SignIn di Clerk.
  - Configurazione eventuale degli App Links per i Magic Link Clerk.
- [ ] Dichiarazione Privacy: Inserisci il link alle policy e ai Termini & Condizioni nell'App Dashboard.

## 🍏 App Store (iOS)
- [ ] Crea un Apple Developer Account (Costo annuale $99 o registrazione Enterprise).
- [ ] Installa e esegui `npx cap add ios`.
- [ ] Attesa approvazione per TestFlight / Registrazione UUIDs per test interno (Ad-Hoc).
- [ ] Asset Fotografici:
  - Icone con molteplici risoluzioni generate da App Icon Generator (o XCode).
  - Screenshots in specifici formati per iOS e iPad (fino a 6.5 pollici).
- [ ] Autenticazione Orizzontale: 
  - Apple tende a richiedere il 'Sign in with Apple' se si ha l'accesso con servizi terzi (come Google). Nel Setup Clerk, abilitare *Apple Sign-In*.
- [ ] Normative: 
  - Conferma per l'assenza di contenuti controversi. 

## 🛍 AppGallery (Huawei / HarmonyOS)
- [ ] Crea un account Huawei Developer (Gratuito per sviluppatori di base).
- [ ] Ottieni un attestato DUNS o validazione aziendale (richiesto per app business nel segmento enterprise).
- [ ] Dato l'assenza dei GMS (Google Mobile Services), qualora Supabase o Clerk si interfacciassero a Google APIs, ci possono essere drop-offs. Controllare se Clerk/Supabase Auth dipende da servizi GMS, specialmente durante Google Sign-In.
- [ ] Compilare .APK direttamente da Android Studio per invio ad AppGallery, dato che `capacitor/android` è sufficientemente cross-compliant per dispositivi Android-based Huawei.
