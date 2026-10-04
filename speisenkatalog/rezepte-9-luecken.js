// Standardrezepte für Komponenten aus den echten Angeboten, die im Katalog bisher fehlten – Bezugsmenge 200 g/ml.
const R = [];
const add = (names, z, s) => R.push({ names: [].concat(names), z, s });

// ---- Beilagen & Gemüse ----
add(['Dillkartoffeln', 'Paprikakartoffeln'], 'Kartoffeln 200 g; Wasser 400 ml; Salz 4 g; Butter 8 g; Dill/Paprikapulver 3 g', 'Kartoffeln schälen, in Salzwasser 20–25 Min. garen, abgießen und ausdampfen, in Butter mit Dill (bzw. Paprikapulver) schwenken.');
add('Tomaten-Pilz-Gemüse', 'Pilze 100 g; Tomaten 80 g; Zwiebel 15 g; Olivenöl 10 ml; Thymian 1 Zweig; Salz 2 g', 'Zwiebel und Pilze in Öl kräftig anbraten, Tomaten zugeben, 5 Min. schmoren, würzen.');
add('Wildkräutersalat', 'Wildkräuter/Blattsalat 170 g; Dressing 25 ml; Salz 1 Prise', 'Kräuter waschen, trocken schleudern, kurz vor dem Servieren mit Vinaigrette anmachen.');
add('Olivier-Salat', 'Kartoffeln (gekocht) 70 g; Eier 0.5 Stk; Gewürzgurke 25 g; Karotten (gekocht) 25 g; Erbsen 20 g; Wurst/Hähnchen 30 g; Mayonnaise 30 g; Salz 1 Prise', 'Alle gekochten Zutaten in kleine Würfel schneiden, mit Mayonnaise mischen, würzen, 2 Std. kalt ziehen lassen.');
add('Rote-Bete-Vinaigrette-Salat', 'Rote Bete (gekocht) 100 g; Kartoffeln (gekocht) 50 g; Sauerkraut 25 g; Gewürzgurke 20 g; Zwiebel 8 g; Öl 15 ml; Essig 5 ml', 'Gemüse würfeln, mit Zwiebel, Öl und Essig mischen, 1 Std. ziehen lassen (Rote Bete zuletzt, damit nichts abfärbt).');
add('Asiatischer Glasnudelsalat', 'Glasnudeln (gekocht) 100 g; Gemüse (Streifen) 70 g; Koriander 3 g; Sojasoße 10 ml; Limettensaft 8 ml; Sesamöl 2 ml; Chili 1 g', 'Nudeln einweichen, abschrecken, mit Gemüse, Koriander und Dressing aus Soja, Limette, Sesamöl mischen.');
add('Meeresfrüchtesalat', 'Meeresfrüchte (gegart) 120 g; Sellerie 20 g; Paprika 20 g; Olivenöl 12 ml; Zitronensaft 10 ml; Petersilie 3 g; Salz 1 Prise', 'Meeresfrüchte kurz blanchieren, abkühlen, mit Gemüse und Dressing marinieren, 1 Std. ziehen lassen.');

// ---- Soßen & Cremes ----
add(['Barolosoße'], 'Barolo (Rotwein) 80 ml; Rinderfond 100 ml; Schalotte 15 g; Butter 8 g; Speisestärke 3 g; Thymian 1 Zweig; Salz 1 Prise', 'Schalotte in Butter anschwitzen, mit Barolo ablöschen und um die Hälfte einkochen, Fond zugeben, reduzieren, mit Stärke binden, abschmecken.');
add('Bärlauchsoße', 'Gemüsefond 80 ml; Sahne 100 ml; Bärlauch 15 g; Schalotte 10 g; Butter 8 g; Salz 1 Prise', 'Schalotte in Butter andünsten, mit Fond und Sahne 8 Min. einkochen, Bärlauch zugeben und pürieren, abschmecken.');
add(['Kräuterschmand'], 'Schmand 170 g; Kräuter (gemischt) 15 g; Zitronensaft 5 ml; Salz 1 Prise; Pfeffer 1 Prise', 'Kräuter fein hacken, mit Schmand und Würze verrühren, kalt stellen.');
add(['Champignoncreme', 'Pilzcreme', 'Waldpilzcreme'], 'Champignons/Waldpilze 80 g; Frischkäse 80 g; Sahne 30 ml; Schalotte 10 g; Butter 5 g; Salz 1 Prise', 'Pilze mit Schalotte in Butter braten, abkühlen, fein pürieren, mit Frischkäse und Sahne glatt rühren, abschmecken.');
add('Burratacreme', 'Burrata 120 g; Sahne 40 ml; Olivenöl 10 ml; Salz 1 Prise; Basilikum 2 g', 'Burrata mit Sahne und Öl glatt pürieren, würzen, Basilikum unterheben, kalt stellen.');
add('Sour Cream', 'Saure Sahne 200 g; Salz 1 Prise', 'Fertigprodukt – abschmecken und kalt servieren.');

// ---- Suppen ----
add('Maronencremesuppe', 'Maronen (gegart) 70 g; Zwiebel 20 g; Butter 8 g; Gemüsefond 120 ml; Sahne 40 ml; Weißwein 20 ml; Thymian 1 Zweig; Salz 1 Prise', 'Zwiebel in Butter andünsten, Maronen zugeben, mit Wein ablöschen, mit Fond 15 Min. köcheln, pürieren, Sahne zugeben, abschmecken.');
add('Borschtsch', 'Rote Bete 50 g; Weißkohl 40 g; Kartoffel 25 g; Karotte 20 g; Zwiebel 15 g; Rinderfond 120 ml; Tomatenmark 5 g; Essig 3 ml; Öl 5 ml; Dill 2 g', 'Gemüse würfeln bzw. raspeln, in Öl mit Tomatenmark anschwitzen, mit Fond 35 Min. köcheln, mit Essig und Dill abschmecken; mit Schmand servieren.');

// ---- Hauptgerichte ----
add('Schweinegulasch ungarischer Art', 'Schweinefleisch (gewürfelt) 200 g; Zwiebel 60 g; Paprika 40 g; Paprikapulver edelsüß 8 g; Tomatenmark 8 g; Kümmel 1 g; Brühe 150 ml; Öl 1 EL', 'Fleisch anbraten, Zwiebeln und Paprikapulver kurz rösten, Tomatenmark und Paprika zugeben, mit Brühe 1,5 Std. weich schmoren.');
add(['Schweinenackensteaks', 'Putensteaks'], 'Nacken-/Putensteaks 200 g; Öl 1 EL; Salz 1 Prise; Pfeffer 1 Prise; Marinade (Kräuter/Paprika) 20 g', 'Steaks 2 Std. marinieren, abtupfen, bei starker Hitze 4–5 Min. pro Seite braten bzw. grillen, ruhen lassen.');
add('Orientalische Couscouspfanne', 'Couscous 80 g; Gemüse 70 g; Kichererbsen 30 g; Brühe 100 ml; Ras el Hanout 2 g; Olivenöl 10 ml; Koriander 3 g', 'Gemüse anbraten, Couscous mit heißer Brühe quellen lassen, untermischen, würzen, Koriander zuletzt.');
add('Kiewer', 'Hähnchenbrust 140 g; Butter 40 g; Knoblauch 1 Zehe; Petersilie 3 g; Mehl 15 g; Ei 1 Stk; Paniermehl 30 g; Öl 40 ml', 'Hähnchenbrust einschneiden, mit Kräuterbutter füllen, panieren (Mehl – Ei – Brösel), bei 170 °C goldbraun ausbacken, im Ofen 10 Min. nachgaren.');
add('Schaschlik', 'Fleisch (Hähnchen/Rind) 200 g; Zwiebel 40 g; Paprika 40 g; Öl 1 EL; Paprikapulver 2 g; Salz 1 Prise', 'Fleisch würfeln, marinieren, mit Zwiebel und Paprika aufspießen, 8–10 Min. grillen, wenden.');
add('Gefüllte Kohlrouladen', 'Weißkohlblätter 80 g; Hackfleisch 120 g; Reis (gekocht) 30 g; Zwiebel 20 g; Brühe 100 ml; Tomatenmark 5 g; Salz 1 Prise', 'Blätter blanchieren, mit Hackmasse füllen, aufrollen, anbraten und in Brühe mit Tomatenmark 45 Min. schmoren.');
add(['Pelmeni', 'Wareniki', 'Piroggen'], 'Teigtaschen (frisch/TK) 200 g; Salz 5 g; Wasser 1 l; Butter 10 g; Saure Sahne 30 g', 'In kochendem Salzwasser garen, bis sie oben schwimmen (5–7 Min.), abtropfen, mit Butter und Saurer Sahne servieren (Piroggen: ggf. in Butter anbraten).');
add('Pulled Plant', 'Jackfruit/Soja-Schnetzel 200 g; BBQ-Soße 40 g; Rauchpaprika 2 g; Zwiebel 20 g; Öl 1 EL; Gemüsefond 60 ml', 'Jackfruit zerzupfen, mit Zwiebel anbraten, mit Fond und BBQ-Soße 20 Min. schmoren.');
add('Grillkäse', 'Grillkäse 200 g; Olivenöl 5 ml', 'Käse in Scheiben schneiden, ohne weiteres Fett 2 Min. pro Seite braten bzw. grillen.');
add('Scaloppine al Limone', 'Kalbs-/Schweineschnitzel 200 g; Mehl 15 g; Butter 15 g; Zitronensaft 20 ml; Weißwein 30 ml; Petersilie 3 g; Salz 1 Prise', 'Schnitzel dünn klopfen, mehlieren, in Butter braten, mit Wein und Zitronensaft ablöschen, kurz einkochen.');
add('Kartoffel-Blumenkohl-Auflauf', 'Kartoffeln 100 g; Blumenkohl 80 g; Sahne 40 ml; Milch 30 ml; Käse 30 g; Muskat 1 Prise; Salz 1 Prise', 'Gemüse vorgaren, schichten, mit Sahne-Milch-Guss übergießen, mit Käse bei 180 °C 35 Min. überbacken.');
add('Chop Suey', 'Gemüse (Streifen) 140 g; Sojasoße 15 ml; Austernsoße 10 ml; Speisestärke 4 g; Knoblauch 1 Zehe; Ingwer 3 g; Öl 1 EL; Fleisch/Tofu 60 g', 'Im Wok Fleisch/Tofu anbraten, Gemüse zugeben, mit Soßen ablöschen, mit Stärke leicht binden.');
add('Muschelnudel', 'Muschelnudeln (roh) 80 g; Ricotta 70 g; Spinat 50 g; Knoblauch 1 Zehe; Olivenöl 5 ml; Parmesan 10 g', 'Nudeln al dente kochen, Spinat mit Knoblauch in Öl dünsten, mit Ricotta und Nudelwasser zu einer Soße verrühren, Nudeln unterheben.');
add(['Hähnchenbrust in Mandelpanade'], 'Hähnchenbrust 200 g; Mandelblättchen 40 g; Paniermehl 15 g; Mehl 15 g; Ei 1 Stk; Salz 1 Prise; Öl 40 ml', 'Brust würzen, in Mehl, Ei und Mandel-Brösel panieren, bei 170 °C goldbraun ausbacken.');
add(['Überbackene Hähnchenbrust'], 'Hähnchenbrust 200 g; Käse (gerieben) 40 g; Sahne 20 ml; Öl 1 EL; Salz 1 Prise; Pfeffer 1 Prise', 'Brust würzen, anbraten, mit Käse und etwas Sahne belegen, bei 200 °C 10 Min. überbacken.');
add('Hähnchen mit Käsekruste', 'Hähnchenbrust 200 g; Spinat 30 g; Käse (gerieben) 30 g; Paniermehl 15 g; Butter 10 g; Salz 1 Prise', 'Brust anbraten, mit Spinat-Käse-Brösel-Kruste belegen, bei 200 °C 12 Min. überbacken.');
add('Süßkartoffel-Kokos-Curry', 'Süßkartoffeln 120 g; Kokosmilch 70 ml; Currypaste 10 g; Zwiebel 20 g; Spinat 20 g; Öl 1 EL; Salz 1 Prise', 'Zwiebel und Currypaste rösten, Süßkartoffelwürfel zugeben, mit Kokosmilch 20 Min. garen, Spinat zuletzt.');
add(['Polpette', 'Veggie-Polpette', 'Vegane Hackbällchen', 'Veggie-Bällchen'], 'Hackmasse (Fleisch oder Gemüse) 200 g; Ei 0.5 Stk; Paniermehl 25 g; Zwiebel 20 g; Kräuter 3 g; Salz 1 Prise; Öl 1 EL', 'Masse mit Zutaten verkneten, Bällchen formen, goldbraun braten oder bei 180 °C 15 Min. backen, in Soße ziehen lassen.');
add('Mini-Beef-Wellington', 'Rinderfilet 100 g; Blätterteig 60 g; Champignons 40 g; Parmaschinken 15 g; Senf 3 g; Eigelb 0.3 Stk', 'Filet anbraten, mit Senf bestreichen, in Pilz-Duxelles und Schinken einschlagen, in Blätterteig wickeln, bei 200 °C 20 Min. backen.');
add('Veggie-Burger', 'Veggie-Patty 100 g; Burger-Brötchen 1 Stk; Salat 15 g; Tomate 20 g; Soße 15 g', 'Patty braten, Brötchen toasten, belegen.');
add('Empanadas', 'Teig 80 g; Füllung (Käse/Hack, Mais, Bohnen) 100 g; Ei (Eigelb) 0.3 Stk', 'Teig ausrollen, ausstechen, füllen, zusammenklappen, mit Eigelb bestreichen, bei 200 °C 20 Min. backen.');
add('Gefüllte Eier', 'Eier 4 Stk; Mayonnaise 20 g; Senf 5 g; Schnittlauch 3 g; Salz 1 Prise', 'Eier hart kochen, halbieren, Eigelb mit Mayonnaise und Senf cremig rühren, zurückfüllen, mit Schnittlauch garnieren.');
add('Hering im Pelzmantel', 'Matjes/Hering 50 g; Kartoffeln (gekocht) 50 g; Rote Bete (gekocht) 50 g; Karotten (gekocht) 25 g; Zwiebel 10 g; Mayonnaise 40 g; Ei 0.5 Stk', 'Schichtweise Hering, Zwiebel, Kartoffeln, Karotten, Ei und Rote Bete mit Mayonnaise einstreichen, über Nacht kühlen.');
add('Hering mit Zwiebeln', 'Matjesfilet 120 g; Zwiebel 50 g; Saure Sahne 30 g; Dill 2 g; Pfeffer 1 Prise', 'Hering wässern, in Stücke schneiden, mit Zwiebelringen und Sahne anrichten, mit Dill bestreuen.');
add('Kaviarpastete', 'Frischkäse 100 g; Kaviar/Rogen 40 g; Sahne 40 ml; Zitronensaft 5 ml; Dill 2 g; Blätterteigpastete 1 Stk', 'Frischkäse mit Sahne und Zitrone glatt rühren, Kaviar unterheben, in Pastetchen füllen, kalt servieren.');
add('Blini', 'Mehl 70 g; Milch 90 ml; Ei 0.5 Stk; Hefe 3 g; Butter 5 g; Salz 1 Prise', 'Hefeteig aus Mehl, Milch, Ei zubereiten, 30 Min. gehen lassen, kleine Pfannkuchen backen.');
add('Zwiebelkuchen', 'Mürbe-/Hefeteig 70 g; Zwiebeln 100 g; Speck 15 g; Sahne 40 ml; Ei 1 Stk; Kümmel 1 g; Salz 1 Prise', 'Teig auslegen, gedünstete Zwiebeln mit Speck verteilen, mit Eier-Sahne-Guss übergießen, bei 190 °C 30 Min. backen.');
add('Mini-Pizzen', 'Pizzateig 100 g; Tomatensoße 40 g; Mozzarella 40 g; Belag 20 g', 'Mini-Pizzen belegen, bei 250 °C 6–8 Min. backen.');
add(['Canapés'], 'Brot/Toast 60 g; Aufstrich 30 g; Belag (Lachs/Brie/Oliven/Roastbeef) 100 g; Garnitur 10 g', 'Brot in Stücke schneiden bzw. ausstechen, bestreichen, belegen, garnieren und kühl halten.');
add('Mortadella', 'Mortadella 200 g', 'Fertigprodukt – dünn aufschneiden, kühl halten, mit Pesto servieren.');
add('Prosciutto e Formaggi', 'Prosciutto 100 g; Käse (Parmesan/Pecorino) 100 g; Feigen/Oliven 20 g', 'Schinken und Käse dünn aufschneiden bzw. brechen, mit Beilagen anrichten.');
add('Cicchetti', 'Brot 60 g; Belag (Fisch/Schinken/Gemüse/Käse) 120 g; Olivenöl 5 ml', 'Brotscheiben rösten, mit Belägen nach Wahl belegen, mit Öl beträufeln, als Häppchen anrichten.');
add('Gefüllte Mini-Tomate', 'Mini-Tomaten 120 g; Burratacreme 60 g; Basilikum 2 g; Salz 1 Prise', 'Tomaten aushöhlen, mit Burratacreme füllen, mit Basilikum garnieren, kalt stellen.');
add('Laugenkonfekt', 'Laugenkonfekt (TK/Teigling) 200 g', 'Bei 200 °C 8–10 Min. aufbacken, abkühlen, mit Dips servieren.');
add('Geflügelwürstchen im Schlafrock', 'Geflügelwürstchen 80 g; Blätterteig 100 g; Eigelb 0.3 Stk; Senf 5 g', 'Würstchen in Blätterteig einrollen, mit Eigelb bestreichen, bei 200 °C 15–18 Min. backen.');
add('Obstspieße', 'Obst (gemischt) 200 g', 'Obst waschen, in Stücke schneiden, abwechselnd aufspießen, kühl stellen.');
add('Over Night Oats', 'Haferflocken 50 g; Milch/Pflanzenmilch 100 ml; Joghurt 40 g; Chiasamen 5 g; Honig 5 g; Obst 40 g', 'Alles außer Obst verrühren, über Nacht kühlen, mit Obst toppen.');
add('Mini-Acai-Bowls', 'Acai-Püree 100 g; Banane 50 g; Pflanzenmilch 30 ml; Granola 15 g; Obst 20 g', 'Acai mit Banane und Milch cremig mixen, in Schälchen füllen, mit Granola und Obst toppen.');

// ---- Desserts ----
add(['Milchreis', 'Apfel-Milchreis'], 'Milchreis 40 g; Milch 160 ml; Zucker 15 g; Vanille 1 Prise; Zimt 1 Prise; Apfel (bei Apfel-Milchreis) 30 g', 'Reis mit Milch, Zucker und Vanille aufkochen, bei kleiner Hitze 30 Min. quellen lassen, mit Zimt-Zucker (und Apfelkompott) servieren.');
add('Crema Catalana', 'Milch 150 ml; Eigelb 2 Stk; Zucker 30 g; Speisestärke 6 g; Zitronenschale 1 TL; Zimtstange 1 Stk; Zucker zum Karamellisieren 10 g', 'Milch mit Zitrone und Zimt erhitzen, Eigelb mit Zucker und Stärke einrühren, eindicken, abfüllen, kühlen, mit Zucker karamellisieren.');
add('Medovik', 'Mehl 70 g; Honig 40 g; Zucker 30 g; Ei 1 Stk; Butter 20 g; Saure Sahne 80 g; Sahne 40 ml; Backpulver 2 g', 'Dünne Honigteigböden backen, mit Sahne-Creme schichten, 12 Std. durchziehen lassen, mit Teigbröseln bestreuen.');
add('Syrniki', 'Quark 150 g; Ei 0.5 Stk; Mehl 30 g; Zucker 15 g; Vanille 1 Prise; Butter 10 g', 'Quark mit Ei, Mehl und Zucker verrühren, Küchlein formen, in Butter goldbraun braten.');
add('Cannoli', 'Cannoli-Röllchen 40 g; Ricotta 100 g; Puderzucker 25 g; Pistazien 15 g; Schokostückchen 10 g', 'Ricotta mit Zucker cremig rühren, kurz vor dem Servieren in die Röllchen spritzen, Enden in Pistazien tauchen.');
add('Veganes Schoko-Mousse', 'Zartbitterschokolade (vegan) 80 g; Aquafaba/Kokosmilch 100 ml; Zucker 15 g', 'Schokolade schmelzen, mit geschlagenem Aquafaba bzw. Kokoscreme vorsichtig unterheben, 4 Std. kühlen.');
add(['Windbeutel', 'Spritzkuchen'], 'Wasser 80 ml; Butter 30 g; Mehl 50 g; Eier 1 Stk; Sahne 70 ml; Puderzucker 10 g', 'Brandteig abrösten, Eier unterrühren, Windbeutel spritzen, bei 200 °C 25 Min. backen, auskühlen, mit Sahne füllen.');
add('Muffins', 'Mehl 70 g; Zucker 40 g; Ei 1 Stk; Milch 50 ml; Öl 30 ml; Backpulver 4 g; Geschmack (Schoko/Beeren) 20 g', 'Trockene und flüssige Zutaten getrennt mischen, kurz verrühren, in Förmchen bei 180 °C 20 Min. backen.');
add('Schoko-Espresso-Creme', 'Sahne 100 ml; Zartbitterschokolade 60 g; Espresso 20 ml; Zucker 10 g', 'Sahne mit Espresso erhitzen, über die Schokolade gießen, glatt rühren, kühlen und aufschlagen.');
add('Birnen-Hafer-Crumble', 'Birnen 130 g; Haferflocken 25 g; Mehl 20 g; Butter/Margarine 20 g; Zucker 20 g; Zimt 1 Prise', 'Birnen würfeln, Streusel aus Hafer, Mehl, Fett, Zucker kneten, aufstreuen, bei 190 °C 25 Min. backen.');
add('Crumbles', 'Mehl 90 g; Butter 60 g; Zucker 50 g; Vanille 1 Prise', 'Zu Streuseln verkneten, bei 180 °C 15 Min. backen, abkühlen.');
module.exports = R;
