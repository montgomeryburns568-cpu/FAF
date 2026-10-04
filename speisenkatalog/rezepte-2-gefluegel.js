// Standardrezepte Hähnchen, Pute, Ente & Gans – Bezugsmenge 200 g Rohware (Hauptkomponente).
const R = [];
const add = (names, z, s) => R.push({ names: [].concat(names), z, s });

// ---- Hähnchen ----
add(['Gegrillte Hähnchenbrust', 'Hähnchenbrust', 'Hähnchenbrustfilet gebraten', 'Hähnchenbrusttranche', 'Hähnchenbrusttranchen', 'Gegrillte Poulardenbrust', 'Poulardenbrust'],
  'Hähnchenbrust 200 g; Olivenöl 1 EL; Paprikapulver 1 TL; Salz 1 Prise; Pfeffer 1 Prise',
  'Brust würzen, beidseitig scharf anbraten bzw. grillen, bei 160 °C ca. 10 Min. fertig garen (Kerntemperatur 72 °C), 3 Min. ruhen, aufschneiden.');
add('Hähnchen-Schnitzel', 'Hähnchenbrust 200 g; Mehl 20 g; Ei 1 Stk; Paniermehl 40 g; Salz 1 Prise; Pfeffer 1 Prise; Öl zum Braten 30 ml',
  'Brust aufschneiden, flach klopfen, würzen, panieren (Mehl – Ei – Paniermehl), in Öl goldbraun ausbacken.');
add(['Hähnchen Geschnetzeltes', 'Putengeschnetzeltes', 'Hähnchen Stroganoff'], 'Hähnchenbrust (in Streifen) 200 g; Zwiebel 30 g; Öl 1 EL; Salz 1 Prise; Pfeffer 1 Prise',
  'Fleisch in Streifen schneiden, würzen, portionsweise scharf anbraten, Zwiebeln mitbraten, mit Soße der Wahl vollenden.');
add('Hühner Fricassee', 'Hähnchenbrust (gewürfelt) 200 g; Champignons 50 g; Erbsen 30 g; Spargel 30 g; Weißwein 30 ml; Sahne 80 ml; Geflügelfond 80 ml; Butter 10 g; Mehl 8 g; Zitronensaft 1 TL',
  'Fleisch in Fond garziehen, Gemüse in Butter dünsten, Mehlschwitze mit Fond, Wein und Sahne, Fleisch und Gemüse zugeben, mit Zitrone abschmecken.');
add('Butter Chicken', 'Hähnchenschenkel (ohne Knochen) 200 g; Joghurt 30 g; Garam Masala 3 g; Butter 20 g; Tomatenpüree 60 g; Sahne 50 ml; Zwiebel 30 g; Knoblauch 1 Zehe; Ingwer 3 g; Salz 1 Prise',
  'Hähnchen walnussgroß würfeln, in Joghurt und Gewürzen marinieren, in Butter anbraten, Zwiebel, Knoblauch und Ingwer zugeben, Tomatenpüree einkochen, Sahne zugeben, 10 Min. köcheln.');
add('Chicken Teriyaki', 'Hähnchenschenkel (ohne Knochen) 200 g; Sojasoße 30 ml; Mirin 20 ml; Honig 10 g; Ingwer 3 g; Knoblauch 1 Zehe; Sesam 3 g; Öl 1 EL',
  'Hähnchen in Stücke schneiden, anbraten, mit Sojasoße, Mirin, Honig, Ingwer und Knoblauch ablöschen und glasieren, mit Sesam bestreuen.');
add(['Buffalo Wings', 'Chickenwings'], 'Chickenwings 200 g; Hot Sauce 30 ml; Butter 15 g; Paprikapulver 2 g; Knoblauchpulver 1 g; Salz 1 Prise; Öl 1 EL',
  'Wings würzen, bei 200 °C 35 Min. backen (einmal wenden), mit Hot-Sauce-Butter (bzw. BBQ-Soße) durchschwenken.');
add('Coq au Vin', 'Hähnchenkeule 200 g; Rotwein 80 ml; Geflügelfond 60 ml; Speck 20 g; Champignons 40 g; Perlzwiebeln 30 g; Tomatenmark 5 g; Thymian 1 Zweig; Mehl 5 g',
  'Keulen anbraten, Speck, Zwiebeln und Pilze mitrösten, Tomatenmark zugeben, mit Wein und Fond ablöschen, 45 Min. schmoren, Soße einkochen.');
add(['Gebratene Hähnchenkeule', 'Gegrillte Hähnchenschenkel', 'Hähnchenschenkel spanischer Art', 'Hähnchenschenkel karibischer Art'],
  'Hähnchenschenkel 200 g; Olivenöl 1 EL; Paprikapulver 1 TL; Knoblauch 1 Zehe; Salz 1 Prise; Pfeffer 1 Prise',
  'Schenkel würzen, bei 200 °C ca. 35–40 Min. backen (Kerntemperatur 80 °C), zwischendurch begießen; Soße der Wahl (z. B. Tomatensugo, Curry-Kokos) separat.');
add('Backhendl', 'Hähnchenkeule/-brust 200 g; Mehl 20 g; Ei 1 Stk; Paniermehl 40 g; Salz 1 Prise; Öl zum Frittieren 60 ml',
  'Hähnchen würzen, panieren (Mehl – Ei – Brösel), bei 170 °C goldbraun ausbacken (ca. 8–10 Min.), abtropfen.');
add('Hähnchenbrust im Speckmantel', 'Hähnchenbrust 200 g; Bacon 40 g; Salbei 2 Blatt; Pfeffer 1 Prise; Öl 1 EL',
  'Brust mit Salbei belegen, mit Bacon umwickeln, anbraten, bei 170 °C ca. 15 Min. garen.');
add(['Gefüllte Hähnchenbrust', 'Gefüllte Putenbrust'], 'Hähnchenbrust 200 g; Frischkäse 40 g; Spinat 30 g; Salz 1 Prise; Pfeffer 1 Prise; Öl 1 EL',
  'Brust seitlich einschneiden, füllen, mit Zahnstocher schließen, anbraten, bei 170 °C ca. 20 Min. garen.');
add(['Hähnchen Cordon bleu'], 'Hähnchenbrust 200 g; Kochschinken 30 g; Käse (Emmentaler) 30 g; Mehl 15 g; Ei 1 Stk; Paniermehl 40 g; Öl 40 ml',
  'Brust einschneiden, mit Schinken und Käse füllen, panieren, bei 170 °C goldbraun ausbacken, ggf. 5 Min. im Ofen nachgaren.');
add('Hähnchen Saltimbocca', 'Hähnchenbrust 200 g; Parmaschinken 30 g; Salbei 3 Blatt; Weißwein 30 ml; Butter 10 g; Mehl 5 g',
  'Brust flach klopfen, mit Salbei und Schinken belegen, in Mehl wenden, in Butter braten, mit Wein ablöschen.');
add('Hähnchenbrust Jäger Art', 'Hähnchenbrust 200 g; Champignons 60 g; Zwiebel 20 g; Tomatenmark 5 g; Rotwein 30 ml; Geflügelfond 80 ml; Öl 1 EL',
  'Brust anbraten, Pilze und Zwiebel mitrösten, Tomatenmark zugeben, ablöschen, 10 Min. schmoren.');
add(['Hähnchen-Gyros'], 'Hähnchenbrust (in Streifen) 200 g; Gyrosgewürz 6 g; Zwiebel 30 g; Öl 1 EL; Joghurt 20 g; Salz 1 Prise',
  'Streifen mit Gewürz und Joghurt 2 Std. marinieren, scharf anbraten, Zwiebeln mitbraten.');
add('Hähnchen Parmigiana', 'Hähnchenbrust 200 g; Paniermehl 30 g; Ei 1 Stk; Tomatensoße 60 g; Mozzarella 40 g; Parmesan 10 g; Öl 20 ml',
  'Brust panieren und anbraten, mit Tomatensoße, Mozzarella und Parmesan belegen, bei 200 °C 10 Min. überbacken.');
add(['Hähnchen-Frikadelle', 'Chicken Nuggets'], 'Hähnchenbrust (gehackt) 200 g; Ei 0.5 Stk; Paniermehl 30 g; Zwiebel 20 g; Salz 1 Prise; Pfeffer 1 Prise; Öl 30 ml',
  'Hack mit Ei, Zwiebel, Brösel und Gewürzen verkneten, formen (Nuggets zusätzlich panieren), goldbraun braten bzw. frittieren.');
add('Hähnchen Piccata', 'Hähnchenbrust 200 g; Mehl 15 g; Ei 1 Stk; Parmesan 15 g; Zitronensaft 10 ml; Butter 10 g; Öl 1 EL',
  'Brust flach klopfen, in Mehl und Parmesan-Ei wenden, goldgelb braten, mit Zitronen-Butter beträufeln.');
add('Hähnchen Cacciatore', 'Hähnchenschenkel 200 g; Tomaten (Dose) 80 g; Paprika 30 g; Zwiebel 20 g; Oliven 10 g; Rotwein 30 ml; Rosmarin 1 Zweig; Knoblauch 1 Zehe',
  'Hähnchen anbraten, Gemüse mitrösten, mit Wein und Tomaten ablöschen, 30 Min. schmoren, Oliven zugeben.');
add(['Hähnchenspieße', 'Putenspieße'], 'Hähnchenbrust (gewürfelt) 200 g; Paprika 40 g; Zwiebel 30 g; Olivenöl 1 EL; Paprikapulver 1 TL; Salz 1 Prise',
  'Fleisch und Gemüse abwechselnd aufspießen, marinieren, 4–5 Min. pro Seite grillen.');
add('Hähnchenbrust Toskana', 'Hähnchenbrust 200 g; Getrocknete Tomaten 20 g; Oliven 10 g; Rosmarin 1 Zweig; Knoblauch 1 Zehe; Olivenöl 1 EL',
  'Brust anbraten, Tomaten, Oliven und Kräuter zugeben, bei 160 °C 10 Min. fertig garen.');
add('Zitronenhähnchen', 'Hähnchenbrust/-schenkel 200 g; Zitronensaft 20 ml; Zitronenschale 1 TL; Thymian 1 Zweig; Knoblauch 1 Zehe; Olivenöl 1 EL',
  'In Zitronen-Kräuter-Öl 2 Std. marinieren, bei 190 °C 20–35 Min. backen bzw. grillen.');
add(['Hähnchen Tajine'], 'Hähnchenschenkel 200 g; Zwiebel 30 g; Aprikosen (getrocknet) 20 g; Oliven 10 g; Ras el Hanout 4 g; Zitronenschale 1 TL; Geflügelfond 80 ml; Koriander 3 g',
  'Hähnchen mit Gewürzen anbraten, Zwiebel zugeben, mit Fond aufgießen, 35 Min. schmoren, Aprikosen und Oliven zugeben.');
add(['Hähnchen Kebab'], 'Hähnchenbrust (in Streifen) 200 g; Joghurt 30 g; Kebab-Gewürz 5 g; Knoblauch 1 Zehe; Zitronensaft 10 ml; Öl 1 EL',
  'Streifen mit Joghurt-Gewürz-Marinade 3 Std. einlegen, scharf anbraten.');
add('Hähnchen Tikka Masala', 'Hähnchenbrust (gewürfelt) 200 g; Joghurt 30 g; Tikka-Masala-Paste 20 g; Tomatenpüree 60 g; Sahne 50 ml; Zwiebel 30 g; Öl 1 EL',
  'Hähnchen in Joghurt-Paste marinieren, anbraten, Zwiebel zugeben, Tomatenpüree einkochen, Sahne zugeben, 10 Min. köcheln.');
add('Hähnchen Korma', 'Hähnchenbrust (gewürfelt) 200 g; Joghurt 40 g; Kokosmilch 60 ml; Mandeln (gemahlen) 15 g; Zwiebel 30 g; Korma-Gewürz 6 g; Öl 1 EL',
  'Zwiebel und Gewürz anrösten, Hähnchen zugeben, mit Kokosmilch und Joghurt 15 Min. sanft garen, Mandeln einrühren.');
add(['Tandoori Hähnchen', 'Tandoorihähnchen'], 'Hähnchenschenkel/-brust 200 g; Joghurt 40 g; Tandoori-Masala 8 g; Zitronensaft 10 ml; Knoblauch 1 Zehe; Salz 1 Prise',
  'In Joghurt-Gewürz-Marinade mind. 4 Std. einlegen, bei 220 °C 20–25 Min. backen bzw. grillen.');
add('Hähnchen Süß-Sauer', 'Hähnchenbrust (gewürfelt) 200 g; Paprika 40 g; Ananas 30 g; Zwiebel 20 g; Essig 20 ml; Zucker 20 g; Ketchup 30 g; Sojasoße 10 ml; Speisestärke 8 g; Öl 1 EL',
  'Fleisch in Stärke wenden und anbraten, Gemüse zugeben, mit Süß-Sauer-Soße ablöschen und binden.');
add('Hähnchen Kung Pao', 'Hähnchenbrust (gewürfelt) 200 g; Erdnüsse 20 g; Paprika 30 g; Chili 2 g; Sojasoße 20 ml; Reisessig 10 ml; Zucker 5 g; Speisestärke 6 g; Öl 1 EL',
  'Hähnchen im Wok scharf anbraten, Chili, Paprika und Erdnüsse zugeben, mit Soße ablöschen und binden.');
add('Hähnchen Thai Curry', 'Hähnchenbrust (in Streifen) 200 g; Currypaste 15 g; Kokosmilch 100 ml; Paprika 30 g; Bambus 20 g; Thai-Basilikum 3 g; Fischsoße 1 TL; Öl 1 EL',
  'Currypaste anrösten, Hähnchen zugeben, mit Kokosmilch aufgießen, Gemüse 8 Min. mitgaren, Basilikum zum Schluss.');
add('Hähnchen Satay', 'Hähnchenbrust 200 g; Kokosmilch 30 ml; Kurkuma 1 g; Koriander 1 g; Erdnusssoße 40 g; Öl 1 EL',
  'Fleisch in Streifen mit Gewürzen marinieren, aufspießen, grillen, mit Erdnusssoße servieren.');
add('Pulled Chicken', 'Hähnchenschenkel 200 g; BBQ-Gewürz 6 g; BBQ-Soße 40 g; Hühnerbrühe 60 ml; Zwiebel 20 g',
  'Hähnchen würzen, bei 150 °C zugedeckt 2 Std. mit Brühe garen, zupfen, mit BBQ-Soße vermengen.');
add('Hähnchen-Bowl', 'Hähnchenbrust 200 g; Sojasoße 15 ml; Sesamöl 1 TL; Ingwer 3 g; Öl 1 EL', 'Brust marinieren, anbraten, in Scheiben auf der Bowl anrichten.');
add('Caesar-Hähnchen', 'Hähnchenbrust 200 g; Öl 1 EL; Paprikapulver 1 TL; Salz 1 Prise; Pfeffer 1 Prise', 'Brust würzen, scharf anbraten und garen, in Streifen schneiden, mit Caesar-Dressing und Parmesan anrichten.');
add(['Chinesischer Hähnchenbrustsalat', 'Hähnchenbrustsalat', 'Mediterraner Hähnchenbrustsalat'], 'Hähnchenbrust 200 g; Öl 1 EL; Salz 1 Prise; Pfeffer 1 Prise',
  'Brust würzen, anbraten, garen, abkühlen, in Streifen schneiden und mit Salat, Dressing und Toppings vermengen.');
add('Mandelhähnchen', 'Hähnchenbrust 200 g; Mandelblättchen 25 g; Ei 1 Stk; Mehl 15 g; Salz 1 Prise; Öl 40 ml',
  'Brust in Streifen schneiden, in Mehl und Ei wenden, in Mandeln panieren, goldbraun ausbacken.');

// ---- Pute ----
add('Putenschnitzel', 'Putenbrust 200 g; Mehl 20 g; Ei 1 Stk; Paniermehl 40 g; Salz 1 Prise; Pfeffer 1 Prise; Öl 30 ml', 'Putenbrust in Scheiben schneiden, flach klopfen, würzen, panieren (Mehl – Ei – Brösel), goldbraun ausbacken.');
add('Mini-Putenschnitzel', 'Putenbrust 200 g; Mehl 20 g; Ei 1 Stk; Sesam 20 g; Paniermehl 20 g; Salz 1 Prise; Öl 30 ml', 'Putenbrust in Streifen schneiden, würzen, in Sesam-Brösel panieren, goldbraun ausbacken.');
add(['Putenmedaillons', 'Putenbrust', 'Putenfilet im Parmamantel'], 'Putenbrust 200 g; Salz 1 Prise; Pfeffer 1 Prise; Öl 1 EL',
  'Putenbrust in Medaillons schneiden, würzen, 3 Min. pro Seite braten, 5 Min. bei 160 °C nachgaren (Parmamantel: mit Parmaschinken umwickeln).');
add(['Putensaltimbocca'], 'Putenbrust 200 g; Parmaschinken 30 g; Salbei 3 Blatt; Weißwein 30 ml; Butter 10 g', 'Putenbrust flach klopfen, mit Salbei und Schinken belegen, in Butter braten, mit Wein ablöschen.');
add('Putenröllchen', 'Putenbrust 200 g; Frischkäse 30 g; Kräuter 5 g; Schinken 20 g; Öl 1 EL', 'Brust flach klopfen, belegen, aufrollen, anbraten, bei 170 °C 15 Min. garen.');
add(['Putenstreifen', 'Putengeschnetzeltes Züricher Art', 'Thai-Putengeschnetzeltes'], 'Putenbrust (in Streifen) 200 g; Salz 1 Prise; Pfeffer 1 Prise; Öl 1 EL', 'Streifen würzen, portionsweise scharf anbraten, mit Soße vollenden.');
add('Putennugget im Kokosmantel', 'Putenbrust 200 g; Kokosraspeln 25 g; Mehl 15 g; Ei 1 Stk; Salz 1 Prise; Öl 40 ml', 'Putenbrust würfeln, in Mehl, Ei und Kokosraspeln panieren, goldbraun ausbacken.');

// ---- Ente & Gans ----
add(['Gebratene Entenbrust', 'Barbarie-Entenbrust', 'Entenbrust'], 'Entenbrust 200 g; Salz 1 Prise; Pfeffer 1 Prise; Thymian 1 Zweig',
  'Haut einritzen, kalt in die Pfanne legen, auf der Hautseite 8 Min. langsam auslassen, wenden, bei 160 °C 8–10 Min. rosa garen, 5 Min. ruhen.');
add('Knusprige Entenkeule', 'Entenkeule 200 g; Salz 1 Prise; Pfeffer 1 Prise; Orangenschale 1 TL; Thymian 1 Zweig; Geflügelfond 50 ml',
  'Keulen würzen, bei 160 °C ca. 2 Std. schmoren, zuletzt bei 220 °C knusprig bräunen.');
add('Knusprige Ente', 'Ente (ganz) 200 g; Salz 1 Prise; Majoran 1 g; Beifuß 1 g; Apfel 40 g; Zwiebel 20 g', 'Ente würzen, mit Apfel und Zwiebel füllen, bei 160 °C ca. 2 Std. braten, zuletzt bei 220 °C knusprig bräunen.');
add(['Gänsekeule', 'Gans'], 'Gänsekeule 200 g; Salz 1 Prise; Majoran 1 g; Apfel 40 g; Zwiebel 20 g; Geflügelfond 60 ml', 'Keule würzen, bei 160 °C 2,5 Std. mit Fond schmoren, zuletzt knusprig bräunen.');
add('Geräucherte Gänsebrust', 'Gänsebrust (geräuchert) 200 g', 'Fertigprodukt – dünn aufschneiden, kalt oder kurz erwärmt servieren.');

module.exports = R;
