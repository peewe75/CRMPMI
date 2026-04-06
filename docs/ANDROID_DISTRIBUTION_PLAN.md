# Android Distribution Plan

Il piano per lo shell nativo di Silhouette CRM. Avremo due diverse configurazioni da manovrare.

## Struttura e Architettura
L'applicazione girerà su Capacitor all'interno del progetto Next.js.
Al momento la codebase usa Next App Router, Clerk per l'Autenticazione e Server Actions/Supabase per le operazioni nel backend locale.

Dato che Next.js 16 con queste features non emette facilmente uno static build (`output: 'export'`), la **strategia Capacitor** che stiamo implementando per Silhouette si basa sui seguenti path:
1. **Puntare al Web Server Proxy**: Usare `server.url` su `capacitor.config.ts` per lanciare la versione Production dell'app all'interno della WebView. Perfetto per MVPs e test.
2. In futuro (se richiesta l'offline mode), migrazione del web-layer per essere client-centrico (React Single Page).

## Checklist Tecnica Capacitor
- [x] `@capacitor/core`, `@capacitor/cli` installati.
- [x] Piattaforma Android stabilita.
- [x] Integrazione di una cartella vuota in `public/index.html` per permettere al Capacitor CLI di avviare il sync.

## Moduli Nativi Essenziali per il CRM
- **Microfono (Importantissimo)**: Il CRM gode di input vocali avanzati (`"Silhouette, aggiungi stock"`). Al momento il browser web gestisce i permessi Audio `MediaRecorder`, ma in Android dovremmo configurare `<uses-permission android:name="android.permission.RECORD_AUDIO" />` nel `AndroidManifest.xml` che è stato appena generato.
- **PWA contro Shell Native**: La Progressive Web App pre-esistente va preservata, lasciando intatti i metadata e manifest del browser. 

## Pubblicazione e Testing (Azione Successiva)
1. Per lanciare dev su Android: `npm run cap:sync` -> `npx cap open android`. Android Studio compilerà.
2. Durante i test sui Device Locali: puntare in `capacitor.config.ts` alla URL della propria rete LAN (es: `server: { url: 'http://192.168.1.XX:3000', cleartext: true }`).
3. Deploy finale in Production APK: Generare il Signed APK via Android Studio per caricamento manuale.
