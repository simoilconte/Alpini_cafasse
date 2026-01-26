/**
 * Gestione comuni italiani
 * 
 * Carica tutti i 7904 comuni italiani dal file JSON locale
 * Fonte: https://github.com/matteocontrini/comuni-json
 */

export interface Comune {
  nome: string;
  provincia: string;
  codiceCatastale: string;
}

// Cache dei comuni per evitare chiamate ripetute
let comuniCache: Comune[] | null = null;
let loadingPromise: Promise<Comune[]> | null = null;

/**
 * Carica tutti i comuni italiani dal file JSON locale
 */
export async function caricaComuni(): Promise<Comune[]> {
  if (comuniCache) {
    return comuniCache;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = fetch('/comuni.json')
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Errore caricamento comuni');
      }
      const data = await response.json();
      // Il JSON ha: { nome, sigla, codiceCatastale, ... }
      return data.map((c: any) => ({
        nome: c.nome,
        provincia: c.sigla || '',
        codiceCatastale: c.codiceCatastale,
      }));
    })
    .then((comuni) => {
      comuniCache = comuni;
      loadingPromise = null;
      console.log(`Caricati ${comuni.length} comuni italiani`);
      return comuni;
    })
    .catch((err) => {
      console.error('Errore caricamento comuni:', err);
      loadingPromise = null;
      return [];
    });

  return loadingPromise;
}

/**
 * Cerca comuni per nome (autocomplete) - versione asincrona
 */
export async function cercaComuniAsync(query: string, limit = 10): Promise<Comune[]> {
  if (!query || query.length < 2) return [];
  
  const comuni = await caricaComuni();
  return filtraComuni(comuni, query, limit);
}

/**
 * Cerca comuni (versione sincrona con cache)
 */
export function cercaComuni(query: string, limit = 10): Comune[] {
  if (!query || query.length < 2) return [];
  if (!comuniCache) return [];
  
  return filtraComuni(comuniCache, query, limit);
}

/**
 * Filtra i comuni per query
 */
function filtraComuni(comuni: Comune[], query: string, limit: number): Comune[] {
  const queryLower = query.toLowerCase().trim();
  
  // Normalizza la query rimuovendo accenti per ricerca più flessibile
  const queryNorm = normalizza(queryLower);
  
  return comuni
    .filter(c => {
      const nomeNorm = normalizza(c.nome.toLowerCase());
      return nomeNorm.includes(queryNorm) || c.nome.toLowerCase().includes(queryLower);
    })
    .sort((a, b) => {
      const aNorm = normalizza(a.nome.toLowerCase());
      const bNorm = normalizza(b.nome.toLowerCase());
      
      // Priorità ai comuni che iniziano con la query
      const aStarts = aNorm.startsWith(queryNorm) || a.nome.toLowerCase().startsWith(queryLower);
      const bStarts = bNorm.startsWith(queryNorm) || b.nome.toLowerCase().startsWith(queryLower);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Poi ordina alfabeticamente
      return a.nome.localeCompare(b.nome);
    })
    .slice(0, limit);
}

/**
 * Normalizza una stringa rimuovendo accenti
 */
function normalizza(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Trova un comune per codice catastale
 */
export function getComuneByCodice(codiceCatastale: string): Comune | undefined {
  if (!comuniCache) return undefined;
  return comuniCache.find(c => c.codiceCatastale === codiceCatastale.toUpperCase());
}

/**
 * Verifica se i comuni sono stati caricati
 */
export function comuniCaricati(): boolean {
  return comuniCache !== null && comuniCache.length > 0;
}

// Pre-carica i comuni all'avvio
if (typeof window !== 'undefined') {
  caricaComuni();
}
