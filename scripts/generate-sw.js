// scripts/generate-sw.js

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Carica le variabili d'ambiente dal file .env
dotenv.config();

// Definisci i percorsi del file template e del file di destinazione
const templatePath = path.resolve('scripts/firebase-messaging-sw.js.template');
const outputPath = path.resolve('static/firebase-messaging-sw.js');

console.log('Generating firebase-messaging-sw.js...');

// Leggi il contenuto del template
let templateContent = fs.readFileSync(templatePath, 'utf-8');

// Oggetto con le sostituzioni da fare
const replacements = {
    __PUBLIC_FIREBASE_API_KEY__: process.env.PUBLIC_FIREBASE_ADMIN_KEY,
    __PUBLIC_FIREBASE_AUTH_DOMAIN__: process.env.PUBLIC_FIREBASE_AUTH_DOMAIN,
    __PUBLIC_FIREBASE_PROJECT_ID__: process.env.PUBLIC_FIREBASE_PROJECT_ID,
    __PUBLIC_FIREBASE_STORAGE_BUCKET__: process.env.PUBLIC_FIRESTORE_STORAGEBUCKET,
    __PUBLIC_FIREBASE_MESSAGING_SENDER_ID__: process.env.PUBLIC_FIRESTORE_MESSAGINGSENDERID,
    __PUBLIC_FIREBASE_APP_ID__: process.env.PUBLIC_FIRESTORE_APPID,
    __PUBLIC_FIREBASE_MEASUREMENT_ID__: process.env.PUBLIC_FIRESTORE_MEASUREMENTID,
};

// Esegui le sostituzioni
for (const [placeholder, value] of Object.entries(replacements)) {
    if (!value) {
        console.warn(`⚠️  Warning: Environment variable for ${placeholder} is not set.`);
    }
    // Usa una RegExp globale per sostituire tutte le occorrenze
    templateContent = templateContent.replace(new RegExp(placeholder, 'g'), value || '');
}

// Scrivi il file finale nella cartella 'static'
fs.writeFileSync(outputPath, templateContent);

console.log('✅ firebase-messaging-sw.js generated successfully in /static folder.');