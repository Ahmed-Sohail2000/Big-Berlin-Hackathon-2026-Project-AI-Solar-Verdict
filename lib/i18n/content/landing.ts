// lib/i18n/content/landing.ts
// Copy for the home page. Claims here follow the same rule as the rest of the product:
// nothing synthetic is presented as accuracy on real photos.

import type { Language } from "../language";

const en = {
  hero: {
    eyebrow: "For solar installers",
    title: "Exact roof dimensions from one photo",
    body: "HelioSense Roof Count replaces counting roof tiles by hand. It finds the tile grid in a photo and turns it into outer dimensions and obstruction positions for your 2D CAD drawing.",
    primary: "Open the tool",
    secondary: "Read the user guide",
    note: "Runs in your browser. Photos stay on this device.",
    illustration: "Illustration: a roof outline with tile grid, one obstruction and a block of panels.",
  },
  facts: [
    { value: "1", label: "photo per roof surface" },
    { value: "6", label: "guided steps from photo to export" },
    { value: "0", label: "photos sent to a server" },
  ],
  what: {
    heading: "What it is",
    body: [
      "A browser tool for the planning staff of solar installers. There is nothing to install. It works with ordinary phone and drone photos of tiled roofs, including photos taken at an angle.",
      "It is a measuring aid, not an autopilot. The app proposes the numbers, and an employee checks them against a visible grid and confirms them before anything can be exported.",
    ],
  },
  does: {
    heading: "What we do",
    intro: "We take over the slow part of measuring a roof, and keep the part that needs your judgement.",
    todayTitle: "Today",
    today: [
      "An employee counts tiles on screen, for 30 to 60 minutes per roof side.",
      "The count is multiplied by the tile size by hand.",
      "Obstruction positions are worked out one by one.",
      "3D tools and free drag-and-drop are too imprecise for the drawing.",
    ],
    withTitle: "With HelioSense",
    with: [
      "The app proposes the count, and you check it against a grid on the photo.",
      "Your tile size turns the count into outer dimensions in metres.",
      "Obstructions are given in whole tiles, from the bottom and from the left.",
      "The result goes into CAD as a true-scale DXF drawing.",
    ],
  },
  how: {
    heading: "How it works",
    steps: [
      { title: "Add a photo", body: "One photo or a whole customer folder. Each file is checked before it opens." },
      { title: "Check edges and count", body: "Drag the four proposed corners onto the roof. It is flattened and measured, and a grid shows the count on the photo." },
      { title: "Enter the tile size", body: "Height, width and overlap in millimetres turn tiles into metres." },
      { title: "Mark obstructions", body: "Windows, chimneys and pipes are detected, drawn or typed, in whole tiles." },
      { title: "Choose a panel option", body: "Stop at the counts, take the automatic proposal, or place panels on the grid." },
      { title: "Confirm and export", body: "After your confirmation: DXF, PDF, PNG, CSV and JSON." },
    ],
  },
  gets: {
    heading: "What you get",
    items: [
      { title: "Outer dimensions", body: "Height, width and area of the roof surface in metres." },
      { title: "Tile counts", body: "Tiles high and wide, with a confidence level and clear warnings." },
      { title: "Obstruction positions", body: "For example: 10 from the bottom, 20 from the left, 4 wide, 5 high." },
      { title: "Panel options", body: "None, automatic or manual. Manual panels snap to the tile grid." },
      { title: "CAD-ready export", body: "A true-scale DXF in millimetres, plus PDF, PNG, CSV and JSON." },
      { title: "A traceable result", body: "The grid is visible, and exports record any count you changed." },
    ],
  },
  privacy: {
    heading: "Customer data stays with you",
    items: [
      { title: "Nothing is uploaded", body: "Photos are processed in your browser. The app has no server route that accepts a photo." },
      { title: "Only pixels are kept", body: "Location, time and device data in a photo are left behind and never reach an export." },
      { title: "Nothing stays behind", body: "Everything lives in this tab. Start over or close it, and it is gone." },
    ],
  },
  limits: {
    heading: "What it does not do",
    items: [
      "Flat roofs without tiles. Measure these with a laser or folding ruler.",
      "3D models, roof pitch, shading or compass direction.",
      "The final module, substructure and string plan. Those stay in CAD.",
      "Hipped, L-shaped or split surfaces in one go. Measure them in sections.",
    ],
    accuracyTitle: "How accurate is it?",
    accuracy:
      "The counting is tested automatically on synthetic roofs with known answers. It has not yet been measured on real customer photos, so we quote no accuracy figure. That is why every count is checked against the grid and confirmed by an employee, and why an unreliable count stays empty rather than guessed.",
    more: "The full list is in the user guide.",
  },
  closing: {
    heading: "Try it on a sample roof",
    body: "The tool includes a clearly marked sample, so you can walk through every step without a customer photo.",
    primary: "Open the tool",
  },
};

export type LandingContent = typeof en;

const de: LandingContent = {
  hero: {
    eyebrow: "Für Solarinstallateure",
    title: "Exakte Dachmaße aus einem Foto",
    body: "HelioSense Roof Count ersetzt das Zählen von Dachziegeln von Hand. Es findet das Ziegelraster im Foto und macht daraus Außenmaße und Hindernispositionen für Ihre 2D-CAD-Zeichnung.",
    primary: "Zum Werkzeug",
    secondary: "Anleitung lesen",
    note: "Läuft in Ihrem Browser. Fotos bleiben auf diesem Gerät.",
    illustration: "Illustration: Dachumriss mit Ziegelraster, einem Hindernis und einem Modulfeld.",
  },
  facts: [
    { value: "1", label: "Foto pro Dachfläche" },
    { value: "6", label: "geführte Schritte vom Foto zum Export" },
    { value: "0", label: "Fotos an einen Server gesendet" },
  ],
  what: {
    heading: "Was es ist",
    body: [
      "Ein Browser-Werkzeug für die Planungsabteilung von Solarinstallateuren. Es muss nichts installiert werden. Es arbeitet mit normalen Handy- und Drohnenfotos von Ziegeldächern, auch wenn sie schräg aufgenommen sind.",
      "Es ist eine Messhilfe, kein Autopilot. Die App schlägt die Zahlen vor. Ihr Team prüft sie an einem sichtbaren Raster und bestätigt sie, bevor etwas exportiert werden kann.",
    ],
  },
  does: {
    heading: "Was wir tun",
    intro: "Wir übernehmen den langsamen Teil der Dachvermessung und lassen Ihnen den Teil, der Ihr Urteil braucht.",
    todayTitle: "Heute",
    today: [
      "Ziegel werden am Bildschirm gezählt, 30 bis 60 Minuten pro Dachseite.",
      "Die Zahl wird von Hand mit den Ziegelmaßen multipliziert.",
      "Hindernispositionen werden einzeln ermittelt.",
      "3D-Werkzeuge und freies Drag-and-drop sind für die Zeichnung zu ungenau.",
    ],
    withTitle: "Mit HelioSense",
    with: [
      "Die App schlägt die Zählung vor, und Sie prüfen sie am Raster auf dem Foto.",
      "Ihre Ziegelmaße machen aus der Zählung Außenmaße in Metern.",
      "Hindernisse werden in ganzen Ziegeln angegeben, von unten und von links.",
      "Das Ergebnis geht als maßstabsgetreue DXF-Zeichnung ins CAD.",
    ],
  },
  how: {
    heading: "So funktioniert es",
    steps: [
      { title: "Foto hinzufügen", body: "Ein Foto oder ein ganzer Kundenordner. Jede Datei wird vor dem Öffnen geprüft." },
      { title: "Kanten und Zählung prüfen", body: "Ziehen Sie die vier vorgeschlagenen Ecken aufs Dach. Es wird entzerrt und vermessen, und ein Raster zeigt die Zählung auf dem Foto." },
      { title: "Ziegelmaße eingeben", body: "Länge, Breite und Überdeckung in Millimetern machen aus Ziegeln Meter." },
      { title: "Hindernisse markieren", body: "Fenster, Schornsteine und Rohre werden erkannt, gezeichnet oder eingetippt, in ganzen Ziegeln." },
      { title: "Moduloption wählen", body: "Bei der Zählung aufhören, den automatischen Vorschlag nehmen oder Module auf dem Raster setzen." },
      { title: "Bestätigen und exportieren", body: "Nach Ihrer Bestätigung: DXF, PDF, PNG, CSV und JSON." },
    ],
  },
  gets: {
    heading: "Was Sie erhalten",
    items: [
      { title: "Außenmaße", body: "Höhe, Breite und Fläche der Dachfläche in Metern." },
      { title: "Ziegelzahlen", body: "Ziegel in Höhe und Breite, mit Sicherheitsstufe und klaren Warnungen." },
      { title: "Hindernispositionen", body: "Zum Beispiel: 10 von unten, 20 von links, 4 breit, 5 hoch." },
      { title: "Moduloptionen", body: "Keine, automatisch oder manuell. Manuelle Module rasten auf das Ziegelraster ein." },
      { title: "CAD-fertiger Export", body: "Eine maßstabsgetreue DXF in Millimetern, dazu PDF, PNG, CSV und JSON." },
      { title: "Nachvollziehbares Ergebnis", body: "Das Raster ist sichtbar, und Exporte halten fest, wenn Sie eine Zählung geändert haben." },
    ],
  },
  privacy: {
    heading: "Kundendaten bleiben bei Ihnen",
    items: [
      { title: "Nichts wird hochgeladen", body: "Fotos werden in Ihrem Browser verarbeitet. Die App hat keine Server-Route, die ein Foto annimmt." },
      { title: "Nur Pixel bleiben", body: "Standort-, Zeit- und Gerätedaten eines Fotos werden verworfen und erreichen nie einen Export." },
      { title: "Nichts bleibt zurück", body: "Alles liegt in diesem Tab. Neu beginnen oder Tab schließen, und es ist weg." },
    ],
  },
  limits: {
    heading: "Was es nicht tut",
    items: [
      "Flachdächer ohne Ziegel. Diese messen Sie mit Laser oder Zollstock.",
      "3D-Modelle, Dachneigung, Verschattung oder Himmelsrichtung.",
      "Die endgültige Modul-, Unterkonstruktions- und Strangplanung. Sie bleibt im CAD.",
      "Walm-, L-förmige oder geteilte Flächen in einem Durchgang. Messen Sie sie abschnittsweise.",
    ],
    accuracyTitle: "Wie genau ist es?",
    accuracy:
      "Die Zählung wird automatisch an synthetischen Dächern mit bekannten Ergebnissen getestet. An echten Kundenfotos wurde sie noch nicht gemessen, deshalb nennen wir keine Genauigkeitszahl. Darum wird jede Zählung am Raster geprüft und von Ihrem Team bestätigt, und eine unzuverlässige Zählung bleibt leer, statt geraten zu werden.",
    more: "Die vollständige Liste steht in der Anleitung.",
  },
  closing: {
    heading: "Probieren Sie es am Beispieldach aus",
    body: "Das Werkzeug enthält ein deutlich gekennzeichnetes Beispiel. So können Sie jeden Schritt ohne Kundenfoto durchgehen.",
    primary: "Zum Werkzeug",
  },
};

export const LANDING: Record<Language, LandingContent> = { en, de };
