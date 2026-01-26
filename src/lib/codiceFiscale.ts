/**
 * Calcolo del Codice Fiscale Italiano
 * 
 * Implementa l'algoritmo ufficiale per il calcolo del CF
 */

// Tabella mesi per il codice fiscale
const MESI: Record<number, string> = {
  1: 'A', 2: 'B', 3: 'C', 4: 'D', 5: 'E', 6: 'H',
  7: 'L', 8: 'M', 9: 'P', 10: 'R', 11: 'S', 12: 'T'
};

// Valori per il calcolo del carattere di controllo (posizioni dispari)
const DISPARI: Record<string, number> = {
  '0': 1, '1': 0, '2': 5, '3': 7, '4': 9, '5': 13, '6': 15, '7': 17, '8': 19, '9': 21,
  'A': 1, 'B': 0, 'C': 5, 'D': 7, 'E': 9, 'F': 13, 'G': 15, 'H': 17, 'I': 19, 'J': 21,
  'K': 2, 'L': 4, 'M': 18, 'N': 20, 'O': 11, 'P': 3, 'Q': 6, 'R': 8, 'S': 12, 'T': 14,
  'U': 16, 'V': 10, 'W': 22, 'X': 25, 'Y': 24, 'Z': 23
};

// Valori per il calcolo del carattere di controllo (posizioni pari)
const PARI: Record<string, number> = {
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
  'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5, 'G': 6, 'H': 7, 'I': 8, 'J': 9,
  'K': 10, 'L': 11, 'M': 12, 'N': 13, 'O': 14, 'P': 15, 'Q': 16, 'R': 17, 'S': 18, 'T': 19,
  'U': 20, 'V': 21, 'W': 22, 'X': 23, 'Y': 24, 'Z': 25
};

// Caratteri di controllo
const CONTROLLO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Consonanti e vocali
const CONSONANTI = 'BCDFGHJKLMNPQRSTVWXYZ';
const VOCALI = 'AEIOU';

/**
 * Estrae consonanti da una stringa
 */
function estraiConsonanti(str: string): string {
  return str.toUpperCase().split('').filter(c => CONSONANTI.includes(c)).join('');
}

/**
 * Estrae vocali da una stringa
 */
function estraiVocali(str: string): string {
  return str.toUpperCase().split('').filter(c => VOCALI.includes(c)).join('');
}

/**
 * Calcola il codice del cognome (3 caratteri)
 */
function calcolaCognome(cognome: string): string {
  const pulito = cognome.replace(/[^A-Za-z]/g, '').toUpperCase();
  const consonanti = estraiConsonanti(pulito);
  const vocali = estraiVocali(pulito);
  
  let codice = consonanti + vocali + 'XXX';
  return codice.substring(0, 3);
}

/**
 * Calcola il codice del nome (3 caratteri)
 */
function calcolaNome(nome: string): string {
  const pulito = nome.replace(/[^A-Za-z]/g, '').toUpperCase();
  const consonanti = estraiConsonanti(pulito);
  const vocali = estraiVocali(pulito);
  
  // Se ci sono 4+ consonanti, prendi la 1a, 3a e 4a
  if (consonanti.length >= 4) {
    return consonanti[0] + consonanti[2] + consonanti[3];
  }
  
  let codice = consonanti + vocali + 'XXX';
  return codice.substring(0, 3);
}

/**
 * Calcola il codice della data di nascita e sesso (5 caratteri)
 */
function calcolaDataSesso(dataNascita: string, sesso: 'M' | 'F'): string {
  const data = new Date(dataNascita);
  const anno = data.getFullYear().toString().substring(2, 4);
  const mese = MESI[data.getMonth() + 1];
  let giorno = data.getDate();
  
  // Per le donne, aggiungi 40 al giorno
  if (sesso === 'F') {
    giorno += 40;
  }
  
  return anno + mese + giorno.toString().padStart(2, '0');
}

/**
 * Calcola il carattere di controllo
 */
function calcolaControllo(codice15: string): string {
  let somma = 0;
  
  for (let i = 0; i < 15; i++) {
    const char = codice15[i];
    if (i % 2 === 0) {
      // Posizione dispari (1, 3, 5, ...) - indice 0, 2, 4, ...
      somma += DISPARI[char] || 0;
    } else {
      // Posizione pari (2, 4, 6, ...) - indice 1, 3, 5, ...
      somma += PARI[char] || 0;
    }
  }
  
  return CONTROLLO[somma % 26];
}

export interface DatiCodiceFiscale {
  nome: string;
  cognome: string;
  dataNascita: string; // formato YYYY-MM-DD
  sesso: 'M' | 'F';
  codiceCatastale: string; // es. "H501" per Roma
}

/**
 * Calcola il codice fiscale completo
 */
export function calcolaCodiceFiscale(dati: DatiCodiceFiscale): string {
  const { nome, cognome, dataNascita, sesso, codiceCatastale } = dati;
  
  if (!nome || !cognome || !dataNascita || !sesso || !codiceCatastale) {
    return '';
  }
  
  const codiceCognome = calcolaCognome(cognome);
  const codiceNome = calcolaNome(nome);
  const codiceDataSesso = calcolaDataSesso(dataNascita, sesso);
  const codiceComune = codiceCatastale.toUpperCase();
  
  const codice15 = codiceCognome + codiceNome + codiceDataSesso + codiceComune;
  const carattereControllo = calcolaControllo(codice15);
  
  return codice15 + carattereControllo;
}

/**
 * Valida un codice fiscale (controllo formale)
 */
export function validaCodiceFiscale(cf: string): boolean {
  if (!cf || cf.length !== 16) return false;
  
  const cfUpper = cf.toUpperCase();
  const regex = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
  
  if (!regex.test(cfUpper)) return false;
  
  // Verifica carattere di controllo
  const codice15 = cfUpper.substring(0, 15);
  const controlloCalcolato = calcolaControllo(codice15);
  
  return cfUpper[15] === controlloCalcolato;
}
