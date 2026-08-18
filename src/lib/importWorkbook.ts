// Import de classeur Excel — fonctions 100 % pures (aucune I/O, aucune écriture).
// L'application des opérations est un étape séparée, effectuée par la page
// AdminImport qui lit le fichier et insère les lignes via la persistance
// habituelle des opérations (toOperationPayload + insert).
//
// Contrat de colonnes (par nom d'en-tête, insensible à la casse, aux accents
// et aux espaces) — feuille « TBL BORD » du classeur « TBX SUIVI DMO actuel » :
//   - nom d'opération : colonne « Nom de l'opération » si présente ; sinon
//     composé depuis « COMMUNE » + « Localisation » (ex. « AMIENS Rue Dejean ») ;
//   - commune : « COMMUNE » ou « Nom de la commune » ;
//   - département : « Dpt », « Dépt »… ;
//   - total logements : « Nb logts », « Nombre de logement(s) »… ;
//   - promoteur : « Si VEFA, Nom Promo », « Promoteur »…
// Aucune colonne de surface n'a été trouvée dans le classeur : le champ
// surface est donc volontairement absent de l'interface (hors périmètre v1).
// Le mapping final reste à confirmer avec le fichier réel par l'utilisateur.

export interface NormalizedImportRow {
  name: string; // requis, trimé
  commune?: string;
  department?: string;
  promoterName?: string;
  totalHousingUnits?: number | null;
  raw: unknown[]; // ligne d'origine pour l'aperçu
}

export interface RejectedRow {
  row: number; // numéro de ligne (1 = première ligne de données)
  reason: string;
}

export interface ImportSkip {
  name: string;
  reason: string;
}

export interface ParsedWorkbook {
  normalized: NormalizedImportRow[];
  rejected: RejectedRow[];
}

export interface PreparedImport {
  toCreate: NormalizedImportRow[];
  skipped: ImportSkip[];
}

type FieldKey = 'name' | 'commune' | 'department' | 'localisation' | 'promoterName' | 'totalHousingUnits';

const HEADER_LABELS: Record<FieldKey, readonly string[]> = {
  name: [
    'nom de l’opération', "nom de l'opération", 'nom d’opération', "nom d'opération",
    'nom de l’operation', "nom de l'operation", 'nom operation', 'nom opération',
    'nom operation', 'opération', 'operation', 'nom op', 'nom',
  ],
  commune: ['commune', 'nom de la commune'],
  department: ['dpt', 'dept', 'département', 'departement', 'code département', 'code departement'],
  localisation: ['localisation', 'adresse', 'rue'],
  promoterName: ['si vefa, nom promoteur', 'si vefa, nom promo', 'nom promoteur', 'nom promo', 'promoteur'],
  totalHousingUnits: ['nb logts', 'nb logt', 'nb logements', 'nombre de logements', 'nombre de logement', 'nbre logts', 'nbre logt', 'total logements'],
};

/** Normalise une valeur d'en-tête : casse, accents, apostrophes et espaces. */
export function normalizeHeaderLabel(value: unknown): string {
  if (value == null) return '';
  return String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Clé de comparaison d'un nom : insensible à la casse, espaces extérieurs retirés. */
export function normalizeNameKey(name: string): string {
  return name.trim().toLocaleLowerCase('fr');
}

/** Tolérant aux variantes : égalité, ou l'un contient l'autre (pour un libellé assez long). */
function matchesLabel(candidate: string, label: string): boolean {
  if (candidate === label) return true;
  if (label.length >= 5 && candidate.includes(label)) return true;
  if (candidate.length >= 5 && label.includes(candidate)) return true;
  return false;
}

function findColumn(header: unknown[], labels: readonly string[]): number {
  const normalized = labels.map(normalizeHeaderLabel);
  for (let index = 0; index < header.length; index += 1) {
    const candidate = normalizeHeaderLabel(header[index]);
    if (candidate && normalized.some((label) => matchesLabel(candidate, label))) return index;
  }
  return -1;
}

function text(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function isBlankRow(row: unknown[]): boolean {
  return row.every((cell) => {
    if (cell == null) return true;
    return /^\s*$/.test(String(cell));
  });
}

/** Les réajuste en nombre (français : espaces des milliers, virgule décimale). */
function toNumberValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const textValue = String(value).trim();
  if (!textValue) return null;
  const compact = textValue.replace(/[\s\u00a0\u202f\u2009]/g, '');
  if (!compact) return null;
  const decimal = compact.includes(',') ? compact.replace(/,/g, '.') : compact;
  const parsed = Number(decimal);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Détecte l'en-tête de la feuille d'opérations : seule une correspondance exacte
 * des libellés canoniques COMMUNE, Localisation, Nb logts et Dpt est acceptée.
 * C'est ce qui écarte les feuilles voisines (CEF, ENEDIS) dont les libellés
 * diffèrent légèrement, même s'ils ressemblent à une feuille d'opérations.
 */
const OPERATION_SHEET_ANCHORS = ['commune', 'localisation', 'nb logts', 'dpt'];
export function isOperationSheetHeader(header: unknown[]): boolean {
  return OPERATION_SHEET_ANCHORS.every((anchor) =>
    header.some((cell) => normalizeHeaderLabel(cell) === anchor),
  );
}

/**
 * Transforme les lignes brutes d'une feuille d'opérations en lignes normalisées.
 * Ne lève jamais ; les lignes sans nom exploitable sont rejetées avec leur numéro,
 * les lignes entièrement vides sont ignorées.
 */
export function parseWorkbookRows(rows: unknown[][], header: string[]): ParsedWorkbook {
  const columns = {
    name: findColumn(header, HEADER_LABELS.name),
    commune: findColumn(header, HEADER_LABELS.commune),
    department: findColumn(header, HEADER_LABELS.department),
    localisation: findColumn(header, HEADER_LABELS.localisation),
    promoterName: findColumn(header, HEADER_LABELS.promoterName),
    totalHousingUnits: findColumn(header, HEADER_LABELS.totalHousingUnits),
  };
  const canComposeName = columns.commune >= 0 && columns.localisation >= 0;
  const nameMissingInHeader = columns.name < 0 && !canComposeName;
  const missingNameReason = nameMissingInHeader
    ? 'nom d’opération introuvable dans l’en-tête'
    : 'nom d’opération manquant';

  const normalized: NormalizedImportRow[] = [];
  const rejected: RejectedRow[] = [];

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const sourceRow = Array.isArray(rows[rowIndex]) ? rows[rowIndex] : [];
    if (isBlankRow(sourceRow)) continue;

    let name = '';
    if (columns.name >= 0) name = text(sourceRow[columns.name]);
    if (!name && canComposeName) {
      const commune = text(sourceRow[columns.commune]);
      const localisation = text(sourceRow[columns.localisation]);
      name = [commune, localisation].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    }

    if (!name) {
      rejected.push({ row: rowIndex + 1, reason: missingNameReason });
      continue;
    }

    const item: NormalizedImportRow = { name, raw: [...sourceRow] };
    if (columns.commune >= 0) {
      const commune = text(sourceRow[columns.commune]);
      if (commune) item.commune = commune;
    }
    if (columns.department >= 0) {
      const department = text(sourceRow[columns.department]);
      if (department) item.department = department;
    }
    if (columns.promoterName >= 0) {
      const promoterName = text(sourceRow[columns.promoterName]);
      if (promoterName) item.promoterName = promoterName;
    }
    if (columns.totalHousingUnits >= 0) {
      item.totalHousingUnits = toNumberValue(sourceRow[columns.totalHousingUnits]);
    }
    normalized.push(item);
  }

  return { normalized, rejected };
}

/**
 * Sépare les lignes à créer de celles à ignorer. Un nom déjà présent côté base
 * (casse-insensible) n'est JAMAIS dans toCreate ; le premier doublon du fichier
 * gagne, les suivants sont ignorés. Aucune écriture n'a lieu ici.
 */
export function prepareImport(
  normalized: NormalizedImportRow[],
  existingNames: ReadonlySet<string>,
): PreparedImport {
  const toCreate: NormalizedImportRow[] = [];
  const skipped: ImportSkip[] = [];
  const seen = new Set<string>();

  for (const item of normalized) {
    const key = normalizeNameKey(item.name);
    if (existingNames.has(key)) {
      skipped.push({ name: item.name, reason: 'Existe déjà' });
      continue;
    }
    if (seen.has(key)) {
      skipped.push({ name: item.name, reason: 'Doublon dans le fichier' });
      continue;
    }
    seen.add(key);
    toCreate.push(item);
  }

  return { toCreate, skipped };
}
