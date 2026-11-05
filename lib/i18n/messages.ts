// lib/i18n/messages.ts
// German for the sentences that `lib/tile-count` and the workspace state produce. Those
// stay English on purpose: the counting code and its tests do not change with the
// language, and the JSON export keeps one stable wording. The text is translated only
// where it is shown. messages.test.ts fails if a new sentence has no German here.
// PURE, DETERMINISTIC, no I/O.

import type { Language } from "./language";

const AXIS: Record<string, string> = { height: "Höhe", width: "Breite" };
const ORIENTATION: Record<string, string> = { portrait: "Hochformat", landscape: "Querformat" };

const comma = (number: string) => number.replace(".", ",");

const EXACT: Record<string, string> = {
  // File checks
  "This file is empty.": "Diese Datei ist leer.",
  "This file is larger than 30 MB.": "Diese Datei ist größer als 30 MB.",
  "Use a JPEG, PNG, HEIC or PDF file.": "Bitte eine JPEG-, PNG-, HEIC- oder PDF-Datei verwenden.",
  "Same name and size as another file here.": "Gleicher Name und gleiche Größe wie eine andere Datei hier.",
  "This file may be incomplete. Check the whole roof is visible.":
    "Diese Datei ist möglicherweise unvollständig. Prüfen Sie, ob das ganze Dach sichtbar ist.",
  "This file could not be read.": "Diese Datei konnte nicht gelesen werden.",
  "This file could not be read. It may be damaged.":
    "Diese Datei konnte nicht gelesen werden. Sie ist möglicherweise beschädigt.",
  "This browser cannot process images.": "Dieser Browser kann keine Bilder verarbeiten.",
  "Image export failed.": "Der Bildexport ist fehlgeschlagen.",

  // Photo quality
  "This photo is very dark, so tile edges may be lost in shadow.":
    "Dieses Foto ist sehr dunkel. Ziegelkanten können im Schatten verloren gehen.",
  "This photo is overexposed, so tile edges may be washed out.":
    "Dieses Foto ist überbelichtet. Ziegelkanten können ausgewaschen sein.",

  // Count
  "The corner points do not form a valid roof shape. Move them and recount.":
    "Die Eckpunkte ergeben keine gültige Dachform. Verschieben Sie sie und zählen Sie neu.",
  "The side joints between tiles could not be followed. Count the width by hand.":
    "Die Seitenfugen der Ziegel ließen sich nicht verfolgen. Zählen Sie die Breite von Hand.",
  "Tile boundaries not reliably detectable. Verify the grid against the photo before using this count.":
    "Ziegelkanten nicht zuverlässig erkennbar. Prüfen Sie das Raster am Foto, bevor Sie diese Zählung verwenden.",

  // Tile size
  "Enter the tile height.": "Geben Sie die Ziegellänge ein.",
  "Enter the tile width.": "Geben Sie die Ziegelbreite ein.",
  "Enter the overlap, or the row spacing.": "Geben Sie die Überdeckung oder die Lattweite ein.",
  "Enter the side overlap, or 0 if there is none.":
    "Geben Sie die Seitenüberdeckung ein, oder 0, wenn es keine gibt.",
  "Row spacing must be greater than zero.": "Die Lattweite muss größer als null sein.",
  "Overlap must be smaller than the tile height.": "Die Überdeckung muss kleiner als die Ziegellänge sein.",
  "Side overlap must be smaller than the tile width.":
    "Die Seitenüberdeckung muss kleiner als die Ziegelbreite sein.",

  // Obstructions
  "Position and size must be whole numbers of tiles.": "Position und Größe müssen ganze Ziegelzahlen sein.",
  "This area extends past the counted roof.": "Dieser Bereich ragt über das gezählte Dach hinaus.",

  // Panels
  "Enter the panel length and width.": "Geben Sie Länge und Breite des Moduls ein.",
  "Enter the panel power.": "Geben Sie die Leistung des Moduls ein.",
  "Spacing values cannot be negative.": "Abstände dürfen nicht negativ sein.",
  "Position must be whole numbers of tiles.": "Die Position muss aus ganzen Ziegelzahlen bestehen.",
  "Custom panel": "Eigenes Modul",
  "Large 460 W": "Groß 460 W",

  // What still blocks the export
  "Enter the tiles high and wide.": "Geben Sie die Ziegelzahl in Höhe und Breite ein.",
  "Fix the obstruction areas first.": "Korrigieren Sie zuerst die Hindernisse.",
  "Place at least one panel, or choose Counts only.":
    "Setzen Sie mindestens ein Modul, oder wählen Sie „Nur Zählung“.",
};

const TEMPLATES: [RegExp, (...parts: string[]) => string][] = [
  [
    /^Tile boundaries not reliably detectable \((\w+)\)\. Count this axis by hand\.$/,
    (axis) => `Ziegelkanten nicht zuverlässig erkennbar (${AXIS[axis]}). Zählen Sie diese Richtung von Hand.`,
  ],
  [
    /^Tiles are very small in this photo \((\w+)\)\. Use a closer or sharper photo\.$/,
    (axis) => `Die Ziegel sind auf diesem Foto sehr klein (${AXIS[axis]}). Verwenden Sie ein näheres oder schärferes Foto.`,
  ],
  [
    /^Tile spacing changes across the roof \((\w+)\)\. Check the corner points, or the surface may not be a single plane\.$/,
    (axis) =>
      `Der Ziegelabstand ändert sich über das Dach (${AXIS[axis]}). Prüfen Sie die Eckpunkte. Eventuell ist die Fläche nicht eben.`,
  ],
  [
    /^The roof edge does not land on a tile edge \((\w+), measured ([\d.]+)\)\. The count may be off by one\.$/,
    (axis, measured) =>
      `Die Dachkante trifft keine Ziegelkante (${AXIS[axis]}, gemessen ${comma(measured)}). Die Zahl kann um eins abweichen.`,
  ],
  [
    /^This photo is only (\d+) x (\d+) pixels\. Use the original file, not a preview or a messenger copy\.$/,
    (width, height) =>
      `Dieses Foto hat nur ${width} x ${height} Pixel. Verwenden Sie die Originaldatei, keine Vorschau oder Messenger-Kopie.`,
  ],
  [
    /^This image declares (\d+) megapixels\. The limit is (\d+)\.$/,
    (declared, limit) => `Dieses Bild gibt ${declared} Megapixel an. Die Grenze liegt bei ${limit}.`,
  ],
  [/^Only the first (\d+) files are checked\.$/, (limit) => `Es werden nur die ersten ${limit} Dateien geprüft.`],
  [
    /^This PDF has (\d+) pages\. Only the first page is used\.$/,
    (pages) => `Dieses PDF hat ${pages} Seiten. Es wird nur die erste Seite verwendet.`,
  ],
  [
    /^An exposed height of ([\d.]+) mm is unusual\. Check that the values are in millimetres\.$/,
    (value) => `Eine Decklänge von ${comma(value)} mm ist ungewöhnlich. Prüfen Sie, ob die Werte in Millimetern sind.`,
  ],
  [
    /^A cover width of ([\d.]+) mm is unusual\. Check that the values are in millimetres\.$/,
    (value) => `Eine Deckbreite von ${comma(value)} mm ist ungewöhnlich. Prüfen Sie, ob die Werte in Millimetern sind.`,
  ],
  [
    /^Too close to the roof edge\. The edge distance is ([\d.]+) mm\.$/,
    (value) => `Zu nah an der Dachkante. Der Randabstand beträgt ${comma(value)} mm.`,
  ],
  [
    /^Too close to an obstruction\. The clearance is ([\d.]+) mm\.$/,
    (value) => `Zu nah an einem Hindernis. Der Abstand beträgt ${comma(value)} mm.`,
  ],
  [
    /^Too close to another panel\. The gap is ([\d.]+) mm\.$/,
    (value) => `Zu nah an einem anderen Modul. Der Modulabstand beträgt ${comma(value)} mm.`,
  ],
  [
    /^Accept or remove (\d+) proposed area\(s\)\.$/,
    (count) => `Übernehmen oder entfernen Sie ${count} vorgeschlagene(n) Bereich(e).`,
  ],
  [
    /^Remove or move (\d+) panel\(s\) that no longer fit\.$/,
    (count) => `Entfernen oder verschieben Sie ${count} Modul(e), die nicht mehr passen.`,
  ],
  [
    /^([\d.]+) tiles from the bottom, ([\d.]+) from the left, (\d+) wide, (\d+) high$/,
    (bottom, left, wide, high) =>
      `${comma(bottom)} Ziegel von unten, ${comma(left)} von links, ${wide} breit, ${high} hoch`,
  ],
  [
    /^([\d.]+) tiles from the bottom, ([\d.]+) from the left, (portrait|landscape)$/,
    (bottom, left, orientation) =>
      `${comma(bottom)} Ziegel von unten, ${comma(left)} von links, ${ORIENTATION[orientation]}`,
  ],
];

/** Shows a sentence in the chosen language. Unknown text stays as it is, so nothing goes missing. */
export function translateMessage(message: string, language: Language): string {
  if (language === "en") return message;
  if (message in EXACT) return EXACT[message];
  for (const [pattern, render] of TEMPLATES) {
    const match = pattern.exec(message);
    if (match) return render(...match.slice(1));
  }
  return message;
}
