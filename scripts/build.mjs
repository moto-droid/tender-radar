import './prepare-misans.mjs';
import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of ["app.js","apple-theme.css","brand/motospatial.png","contact-compose.js","contact-compose.mjs","contact.css","contact.html","contact.js","enhancements.css","enhancements.js","index.html","intelligence.css","intelligence.js","misans.css","motospatial-brand.css","motospatial-shell.js","ms-preferences.css","ms-preferences.js","ms-reading.css","ms-translations.js","styles.css","subscription.css","subscription.js"]){const dest='dist/'+file;await mkdir(dest.substring(0,dest.lastIndexOf('/')),{recursive:true});await cp(file,dest);}
await cp('fonts','dist/fonts',{recursive:true});
