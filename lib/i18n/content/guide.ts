// lib/i18n/content/guide.ts
// Copy for the user guide, in both languages.

import type { Language } from "../language";

const en = {
  title: "How to count a roof",
  intro: "From a roof photo to exact numbers for the CAD drawing. The app proposes; you check and confirm.",
  contentsLabel: "Contents",
  headings: {
    before: "Before you start",
    steps: "Step by step",
    panels: "Panel options",
    warnings: "When something looks wrong",
    scope: "What it solves, and what it does not",
    privacy: "Privacy and file safety",
  },
  checklist: [
    "One photo of each roof surface, with all four corners visible.",
    "The tile height and width in millimetres, from the consultation form or a photo of a tile beside a folding ruler.",
    "The overlap between rows, or the row spacing (batten gauge) if you know it.",
    "A case reference for the export. Avoid customer names here; a case number is enough.",
  ],
  photoCaption: "What makes a good roof photo",
  goodPhoto: "Good photo",
  badPhoto: "Likely to cause trouble",
  photoTips: [
    { good: "Stand far back and include the whole surface.", bad: "Standing under the eave, where the top rows disappear." },
    { good: "Even daylight, or a bright overcast day.", bad: "Low sun that throws long shadows across the tiles." },
    { good: "The original file from the phone.", bad: "A screenshot or a copy sent through a messenger." },
    { good: "A drone photo taken square to the roof, when you have one.", bad: "A very flat angle along the roof surface." },
  ],
  steps: [
    {
      title: "Add a photo or a customer folder",
      body: "Drop one photo, or a whole folder. JPEG, PNG, HEIC and PDF all work, up to 30 MB each. A folder is checked file by file: you see which photos are ready, which were refused and why, and you open them one at a time.",
    },
    {
      title: "Check the roof edges",
      body: "The app proposes four corners. Drag each one onto the real corner of the roof surface. A magnifier helps you place it, and arrow keys move a selected corner one pixel at a time, or ten with Shift. The count updates when you let go.",
    },
    {
      title: "Compare the grid with the tiles",
      body: "This is the most important check. The blue lines must sit on the real tile rows from one edge to the other. Spot-check all four corners of the grid. If it is off, move the corners or type the right count. A poor photo shows “Not reliable” and leaves the count empty for you to fill in.",
    },
    {
      title: "Enter the tile size",
      body: "Enter height, width and overlap in millimetres, or the row spacing if you know it. The app will not guess the overlap, because a wrong one makes the whole roof the wrong height. If you have a photo of a tile beside a folding ruler, click the marks and the app measures the tile.",
    },
    {
      title: "Mark obstructions",
      body: "Press Detect areas for suggestions, drag across the tiles on the photo with Draw on photo, or type the position with Add by numbers. Choose the type and accept each suggestion, because the app does not name them.",
    },
    {
      title: "Choose a panel option",
      body: "Stop at the counts, take the automatic proposal, or place panels yourself. The three options are explained below.",
    },
    {
      title: "Confirm and export",
      body: "Add a case reference, confirm the result, then export. DXF is a true-scale drawing for the CAD program. PDF and PNG include the annotated photo. CSV and JSON carry the numbers. Any later change needs a new confirmation.",
    },
    {
      title: "Finish the roof",
      body: "With a folder open, press Next photo in this folder for the next surface. Tile size and case reference carry over. Press Start over, or close the tab, to discard everything.",
    },
  ],
  panelsIntro: "Yes, you can add and remove panels by hand. The counts are the same in all three options.",
  panelOptions: [
    {
      title: "Counts only",
      body: "The exact scope of the request: roof, tiles and obstructions go to CAD, and modules are planned there. Choose this for difficult roofs.",
    },
    {
      title: "Automatic",
      body: "Straight rows from the eave, around the obstructions, in whichever orientation fits more panels. Good for a quick first figure in a sales conversation. Press Edit this layout by hand to adjust it.",
    },
    {
      title: "Manual",
      body: "Click the photo to add a panel. A green preview shows it fits and a red one shows it does not. Click a panel to remove it, or use the list. Panels snap to whole tiles, and you can type an exact position. Edge distance, gap and clearance are checked for every panel.",
    },
  ],
  troubleshooting: [
    {
      problem: "“Not reliable”, and the count is empty",
      fix: "The tile pattern could not be found. Tighten the corners to the roof, or use a sharper photo. If the grid still does not fit, count that axis by hand and type it in.",
    },
    {
      problem: "“The roof edge does not land on a tile edge”",
      fix: "A corner sits part-way along a tile, so the count may be off by one. Zoom in with the magnifier and move the corner onto a tile edge.",
    },
    {
      problem: "“Tile spacing changes across the roof”",
      fix: "The corners may be misplaced, or the surface is not one flat plane. Check the corners first. Measure a bent or stepped surface in sections.",
    },
    {
      problem: "The width count is about double the real one",
      fix: "Double-wave tiles can read as two tiles. The grid will show it. Type the correct count.",
    },
    {
      problem: "The roof outline starts on the wrong roof",
      fix: "The first guess goes by colour, so a neighbour's roof can fool it. Drag the corners to the right surface.",
    },
    {
      problem: "Metres look wrong, but the tile count is right",
      fix: "Check the overlap and the row spacing. The app warns about values that look like centimetres.",
    },
    {
      problem: "A photo is refused or marked incomplete",
      fix: "The reason is shown beside the file. Copy the original from the phone again, because an interrupted transfer often cuts a file short.",
    },
  ],
  solvesTitle: "Solves",
  solves: [
    "Replaces 30 to 60 minutes of counting per roof side with a result you only review.",
    "Corrects oblique phone photos, the normal case, by flattening the roof first.",
    "Keeps counting through moss, shadow and blurred tile edges, and warns rather than guesses when it cannot.",
    "Makes every count traceable: the grid is visible, and exports record any change you made.",
    "Turns tiles into outer dimensions in metres from your tile size.",
    "Gives obstruction positions in tiles, such as “10 from the bottom, 20 from the left, 4 wide, 5 high”.",
    "Hands results to CAD as a true-scale DXF, with PDF, PNG, CSV and JSON.",
    "Measures without anyone climbing the roof.",
    "Keeps customer photos on your own computer.",
  ],
  doesNotSolveTitle: "Does not solve",
  doesNotSolve: [
    "Flat roofs without tiles. Measure these with a laser or folding ruler.",
    "3D models or photogrammetry. This is exact 2D counting by design.",
    "Roof pitch, shading and compass direction. Pitch is entered separately in your process.",
    "The final module, substructure and string plan. Those stay in CAD. Panel options here are a planning aid.",
    "Non-rectangular surfaces in one go. Hipped, L-shaped and dormer-split surfaces need measuring in sections.",
    "Tiles hidden behind the eave or ridge at a low camera angle. They cannot be counted from that photo.",
    "Saving results or photos to customer folders. Nothing is stored, so keep your exports.",
    "Drone flight or a mobile app. Drone photos work as ordinary files.",
    "Guaranteed accuracy. Results on real customer photos have not been measured yet, so the grid check stays your job.",
  ],
  privacy: [
    {
      title: "Nothing is uploaded",
      body: "“Upload” here means opening a file in your browser. The app has no server route for photos, and the browser policy blocks sending data elsewhere.",
    },
    {
      title: "Files are checked before opening",
      body: "The type is read from the file's contents, not its name. Oversized files, files that declare enormous images, and anything that is not a photo or PDF are refused. Duplicates and system files in a folder are skipped.",
    },
    {
      title: "Only pixels are kept",
      body: "Each photo is redrawn as plain pixels. Location, time and device data, and anything else hidden in the file, are left behind and never reach an export.",
    },
    {
      title: "Nothing stays behind",
      body: "Everything lives in this tab. Start over or closing the tab discards it. File names stay on your screen and are not written into exports.",
    },
    {
      title: "There is no virus scan in the app",
      body: "Files are only drawn as images, never run or stored, so your computer's own antivirus remains the check. A scan would be needed if server storage is added later.",
    },
  ],
  action: "Count a roof",
};

export type GuideText = typeof en;

const de: GuideText = {
  title: "So zählen Sie ein Dach",
  intro: "Vom Dachfoto zu exakten Zahlen für die CAD-Zeichnung. Die App schlägt vor, Sie prüfen und bestätigen.",
  contentsLabel: "Inhalt",
  headings: {
    before: "Bevor Sie beginnen",
    steps: "Schritt für Schritt",
    panels: "Moduloptionen",
    warnings: "Wenn etwas nicht stimmt",
    scope: "Was es löst und was nicht",
    privacy: "Datenschutz und Dateisicherheit",
  },
  checklist: [
    "Ein Foto jeder Dachfläche, mit allen vier Ecken im Bild.",
    "Ziegellänge und Ziegelbreite in Millimetern, aus dem Beratungsbogen oder von einem Foto eines Ziegels neben einem Zollstock.",
    "Die Überdeckung zwischen den Reihen, oder die Lattweite, falls bekannt.",
    "Eine Vorgangsnummer für den Export. Vermeiden Sie hier Kundennamen, eine Nummer genügt.",
  ],
  photoCaption: "Was ein gutes Dachfoto ausmacht",
  goodPhoto: "Gutes Foto",
  badPhoto: "Macht wahrscheinlich Probleme",
  photoTips: [
    { good: "Weit entfernt stehen und die ganze Fläche aufnehmen.", bad: "Direkt unter der Traufe stehen, wo die oberen Reihen verschwinden." },
    { good: "Gleichmäßiges Tageslicht oder ein heller, bedeckter Tag.", bad: "Tief stehende Sonne, die lange Schatten über die Ziegel wirft." },
    { good: "Die Originaldatei vom Handy.", bad: "Ein Screenshot oder eine per Messenger gesendete Kopie." },
    { good: "Ein Drohnenfoto, senkrecht zum Dach aufgenommen, falls vorhanden.", bad: "Ein sehr flacher Winkel entlang der Dachfläche." },
  ],
  steps: [
    {
      title: "Foto oder Kundenordner hinzufügen",
      body: "Legen Sie ein Foto oder einen ganzen Ordner ab. JPEG, PNG, HEIC und PDF funktionieren, je bis 30 MB. Ein Ordner wird Datei für Datei geprüft: Sie sehen, welche Fotos bereit sind, welche abgelehnt wurden und warum, und öffnen sie einzeln.",
    },
    {
      title: "Dachkanten prüfen",
      body: "Die App schlägt vier Ecken vor. Ziehen Sie jede auf die echte Ecke der Dachfläche. Eine Lupe hilft beim Platzieren, und die Pfeiltasten verschieben eine gewählte Ecke um ein Pixel, mit Umschalt um zehn. Die Zählung aktualisiert sich, sobald Sie loslassen.",
    },
    {
      title: "Raster mit den Ziegeln vergleichen",
      body: "Das ist die wichtigste Prüfung. Die blauen Linien müssen von Kante zu Kante auf den echten Ziegelreihen liegen. Prüfen Sie stichprobenartig alle vier Ecken des Rasters. Passt es nicht, verschieben Sie die Ecken oder tragen Sie die richtige Zahl ein. Bei einem schlechten Foto erscheint „Nicht zuverlässig“, und die Zahl bleibt leer, damit Sie sie eintragen.",
    },
    {
      title: "Ziegelmaße eingeben",
      body: "Geben Sie Länge, Breite und Überdeckung in Millimetern ein, oder die Lattweite, falls bekannt. Die App rät die Überdeckung nicht, denn eine falsche ergibt eine falsche Höhe für das ganze Dach. Haben Sie ein Foto eines Ziegels neben einem Zollstock, klicken Sie die Markierungen an, und die App misst den Ziegel.",
    },
    {
      title: "Hindernisse markieren",
      body: "Drücken Sie „Bereiche erkennen“ für Vorschläge, ziehen Sie mit „Auf Foto zeichnen“ über die Ziegel, oder tippen Sie die Position mit „Per Zahlen hinzufügen“ ein. Wählen Sie den Typ und übernehmen Sie jeden Vorschlag, denn die App benennt sie nicht.",
    },
    {
      title: "Moduloption wählen",
      body: "Hören Sie bei der Zählung auf, nehmen Sie den automatischen Vorschlag, oder setzen Sie Module selbst. Die drei Optionen sind unten erklärt.",
    },
    {
      title: "Bestätigen und exportieren",
      body: "Tragen Sie eine Vorgangsnummer ein, bestätigen Sie das Ergebnis und exportieren Sie. DXF ist eine maßstabsgetreue Zeichnung für das CAD-Programm. PDF und PNG enthalten das beschriftete Foto. CSV und JSON enthalten die Zahlen. Jede spätere Änderung braucht eine neue Bestätigung.",
    },
    {
      title: "Dach abschließen",
      body: "Ist ein Ordner geöffnet, drücken Sie für die nächste Fläche „Nächstes Foto in diesem Ordner“. Ziegelmaße und Vorgangsnummer werden übernommen. Mit „Neu beginnen“ oder dem Schließen des Tabs verwerfen Sie alles.",
    },
  ],
  panelsIntro: "Ja, Sie können Module von Hand hinzufügen und entfernen. Die Zählung ist in allen drei Optionen gleich.",
  panelOptions: [
    {
      title: "Nur Zählung",
      body: "Genau der Umfang der Anfrage: Dach, Ziegel und Hindernisse gehen ins CAD, und die Module werden dort geplant. Wählen Sie dies für schwierige Dächer.",
    },
    {
      title: "Automatisch",
      body: "Gerade Reihen ab der Traufe, um die Hindernisse herum, in der Ausrichtung, in der mehr Module passen. Gut für eine schnelle erste Zahl im Verkaufsgespräch. Mit „Diese Belegung von Hand bearbeiten“ passen Sie sie an.",
    },
    {
      title: "Manuell",
      body: "Klicken Sie auf das Foto, um ein Modul hinzuzufügen. Eine grüne Vorschau zeigt, dass es passt, eine rote, dass es nicht passt. Klicken Sie auf ein Modul oder nutzen Sie die Liste, um es zu entfernen. Module rasten auf ganze Ziegel ein, und Sie können eine exakte Position eintippen. Randabstand, Modulabstand und Abstand zu Hindernissen werden für jedes Modul geprüft.",
    },
  ],
  troubleshooting: [
    {
      problem: "„Nicht zuverlässig“, und die Zahl ist leer",
      fix: "Das Ziegelmuster wurde nicht gefunden. Setzen Sie die Ecken genauer aufs Dach, oder verwenden Sie ein schärferes Foto. Passt das Raster weiterhin nicht, zählen Sie diese Richtung von Hand und tragen Sie sie ein.",
    },
    {
      problem: "„Die Dachkante trifft keine Ziegelkante“",
      fix: "Eine Ecke liegt mitten auf einem Ziegel, die Zahl kann also um eins abweichen. Vergrößern Sie mit der Lupe und setzen Sie die Ecke auf eine Ziegelkante.",
    },
    {
      problem: "„Der Ziegelabstand ändert sich über das Dach“",
      fix: "Die Ecken sitzen eventuell falsch, oder die Fläche ist nicht eben. Prüfen Sie zuerst die Ecken. Messen Sie eine geknickte oder gestufte Fläche abschnittsweise.",
    },
    {
      problem: "Die Breite ist etwa doppelt so groß wie in Wirklichkeit",
      fix: "Doppelmuldenziegel können wie zwei Ziegel wirken. Das Raster zeigt es. Tragen Sie die richtige Zahl ein.",
    },
    {
      problem: "Der Dachumriss beginnt auf dem falschen Dach",
      fix: "Die erste Schätzung richtet sich nach der Farbe, ein Nachbardach kann sie also täuschen. Ziehen Sie die Ecken auf die richtige Fläche.",
    },
    {
      problem: "Die Meter wirken falsch, aber die Ziegelzahl stimmt",
      fix: "Prüfen Sie Überdeckung und Lattweite. Die App warnt bei Werten, die nach Zentimetern aussehen.",
    },
    {
      problem: "Ein Foto wird abgelehnt oder als unvollständig markiert",
      fix: "Der Grund steht neben der Datei. Kopieren Sie das Original erneut vom Handy, denn eine unterbrochene Übertragung schneidet Dateien oft ab.",
    },
  ],
  solvesTitle: "Löst",
  solves: [
    "Ersetzt 30 bis 60 Minuten Zählen pro Dachseite durch ein Ergebnis, das Sie nur noch prüfen.",
    "Korrigiert schräge Handyfotos, den Normalfall, indem das Dach zuerst entzerrt wird.",
    "Zählt auch bei Moos, Schatten und unscharfen Ziegelkanten weiter und warnt, statt zu raten, wenn es nicht geht.",
    "Macht jede Zählung nachvollziehbar: Das Raster ist sichtbar, und Exporte halten Ihre Änderungen fest.",
    "Macht aus Ziegeln mit Ihren Ziegelmaßen Außenmaße in Metern.",
    "Gibt Hindernispositionen in Ziegeln an, etwa „10 von unten, 20 von links, 4 breit, 5 hoch“.",
    "Übergibt Ergebnisse als maßstabsgetreue DXF ans CAD, dazu PDF, PNG, CSV und JSON.",
    "Misst, ohne dass jemand aufs Dach steigen muss.",
    "Lässt Kundenfotos auf Ihrem eigenen Computer.",
  ],
  doesNotSolveTitle: "Löst nicht",
  doesNotSolve: [
    "Flachdächer ohne Ziegel. Diese messen Sie mit Laser oder Zollstock.",
    "3D-Modelle oder Photogrammetrie. Dies ist bewusst exaktes 2D-Zählen.",
    "Dachneigung, Verschattung und Himmelsrichtung. Die Neigung wird in Ihrem Ablauf separat erfasst.",
    "Die endgültige Modul-, Unterkonstruktions- und Strangplanung. Sie bleibt im CAD. Die Moduloptionen hier sind eine Planungshilfe.",
    "Nicht rechteckige Flächen in einem Durchgang. Walm-, L-förmige und durch Gauben geteilte Flächen werden abschnittsweise gemessen.",
    "Ziegel, die bei flachem Kamerawinkel hinter Traufe oder First verborgen sind. Sie lassen sich aus diesem Foto nicht zählen.",
    "Speichern von Ergebnissen oder Fotos in Kundenordnern. Es wird nichts gespeichert, bewahren Sie also Ihre Exporte auf.",
    "Drohnenflug oder eine Handy-App. Drohnenfotos funktionieren als normale Dateien.",
    "Garantierte Genauigkeit. Ergebnisse an echten Kundenfotos wurden noch nicht gemessen, die Rasterprüfung bleibt also Ihre Aufgabe.",
  ],
  privacy: [
    {
      title: "Nichts wird hochgeladen",
      body: "„Hochladen“ heißt hier, eine Datei in Ihrem Browser zu öffnen. Die App hat keine Server-Route für Fotos, und die Browser-Richtlinie blockiert das Senden von Daten an andere Stellen.",
    },
    {
      title: "Dateien werden vor dem Öffnen geprüft",
      body: "Der Typ wird aus dem Dateiinhalt gelesen, nicht aus dem Namen. Zu große Dateien, Dateien mit angeblich riesigen Bildern und alles, was kein Foto oder PDF ist, werden abgelehnt. Duplikate und Systemdateien in einem Ordner werden übersprungen.",
    },
    {
      title: "Nur Pixel bleiben",
      body: "Jedes Foto wird als reine Pixel neu gezeichnet. Standort-, Zeit- und Gerätedaten und alles andere, was in der Datei steckt, bleiben zurück und erreichen nie einen Export.",
    },
    {
      title: "Nichts bleibt zurück",
      body: "Alles liegt in diesem Tab. „Neu beginnen“ oder das Schließen des Tabs verwirft es. Dateinamen bleiben auf Ihrem Bildschirm und werden nicht in Exporte geschrieben.",
    },
    {
      title: "Die App enthält keinen Virenscan",
      body: "Dateien werden nur als Bilder gezeichnet, nie ausgeführt oder gespeichert, die Prüfung bleibt also bei Ihrem eigenen Virenschutz. Kommt später Server-Speicher hinzu, wäre ein Scan nötig.",
    },
  ],
  action: "Dach zählen",
};

export const GUIDE: Record<Language, GuideText> = { en, de };
