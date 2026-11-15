# Rinnova

Web app (PWA) che analizza le tue app su GitHub e ne crea una versione migliorata.

1. Scegli un repo tra i tuoi.
2. Rinnova legge il codice e lo fa analizzare a Gemini (piano gratuito): limiti, bug, sicurezza, miglioramenti e un voto.
3. Con un tocco crea un **nuovo repo privato** `NOME-v2` con le correzioni applicate e un file `RINNOVA.md` che spiega cosa è cambiato. L'originale non viene mai modificato.

## Costi
Zero: GitHub Pages è gratuito e la chiave Gemini di Google AI Studio ha un piano gratuito (senza carta di credito). Non attivare la fatturazione su Google AI Studio.

## Chiavi
- **Token GitHub** (fine-grained): All repositories · Contents: Read and write · Administration: Read and write.
- **Chiave Gemini**: https://aistudio.google.com/apikey

Le chiavi restano solo nel browser del dispositivo (localStorage) e vengono inviate soltanto a `api.github.com` e `generativelanguage.googleapis.com`.

## Limiti
- Il piano gratuito di Gemini ha limiti giornalieri: per molte app al giorno potresti doverne fare una parte il giorno dopo.
- Con il piano gratuito Google può usare i contenuti inviati per migliorare i suoi servizi: non usarlo su codice con password o dati riservati.
- Le modifiche dell'AI vanno sempre provate prima di sostituire l'app originale.

## Edizioni per ruolo

Se l'app ha dati o funzioni da riservare (costi, margini, impostazioni, caricamento dati), l'analisi propone fino a 2 **edizioni per ruolo** (es. agente, cliente) e tu scegli quali aggiungere.
Nella versione nuova l'app avrà una sezione **Edizioni per ruolo** che crea un unico file HTML per quel ruolo: funziona da solo e offline, e le parti riservate vengono **tolte dal file**.

Come è protetto:
- il motore `edizioni.js` è un file standard di Rinnova, non lo scrive l'AI;
- nell'HTML l'AI può solo **aggiungere** l'attributo `data-riservato`: se cambia altro, il passo viene annullato;
- il codice deve chiamare `Edizioni.registra` e restare sintatticamente valido, altrimenti il passo viene annullato;
- i dati da includere li sceglie l'AI: in RINNOVA.md trovi cosa verificare a mano.

Non si propone per app i cui dati arrivano da un server (Firebase, Worker, API).
