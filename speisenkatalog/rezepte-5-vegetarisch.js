// Standardrezepte Vegetarisches, Pasta, Suppen, Backwaren, Aufschnitt – Bezugsmenge 200 g (bzw. 200 ml bei Suppen) zubereitete Komponente.
const R = [];
const add = (names, z, s) => R.push({ names: [].concat(names), z, s });

// ---- Pasta & Aufläufe ----
add(['Pasta', 'Vegane Pasta', 'Penne', 'Linguine', 'Tagliatelle', 'Spaghetti Aglio e Olio', 'Penne Arrabbiata', 'Zitronen-Orzo'], 'Nudeln (roh) 90 g; Wasser 900 ml; Salz 9 g; Olivenöl 1 TL', 'Reichlich Salzwasser aufkochen, Nudeln al dente garen (Packungsangabe), abgießen, mit Öl schwenken; mit Soße vermengen.');
add(['Spinat-Ricotta-Tortelloni', 'Ravioli', 'Ravioli mit Steinpilzfüllung', 'Ricotta-Ravioli'], 'Gefüllte Pasta (frisch) 200 g; Salz 5 g; Wasser 1 l; Butter 5 g', 'Pasta im siedenden Salzwasser 3–5 Min. garziehen (sie schwimmt oben), abtropfen, mit Butter und Soße schwenken.');
add('Gnocchi', 'Gnocchi (frisch) 200 g; Butter 10 g; Salz 1 Prise', 'Gnocchi in Salzwasser garen bis sie aufsteigen (2–3 Min.), abtropfen, in Butter anbraten oder in Soße schwenken.');
add('Süßkartoffel-Gnocchi', 'Süßkartoffeln 120 g; Mehl 70 g; Ei 0.3 Stk; Salz 1 Prise; Muskat 1 Prise', 'Süßkartoffeln backen, durchdrücken, mit Mehl, Ei und Gewürzen zu Teig kneten, Rollen schneiden, in Salzwasser garen bis sie aufsteigen.');
add('Schupfnudeln', 'Schupfnudeln (frisch) 200 g; Butter 10 g; Salz 1 Prise', 'Schupfnudeln in Butter goldbraun anbraten.');
add('Gebratene Nudeln', 'Nudeln (gekocht) 180 g; Gemüse (Streifen) 50 g; Sojasoße 15 ml; Ei 0.5 Stk; Öl 1 EL', 'Nudeln im Wok scharf anbraten, Gemüse und Ei zugeben, mit Sojasoße abschmecken.');
add('Asiatische Glasnudeln', 'Glasnudeln (roh) 40 g; Gemüse (Streifen) 80 g; Sojasoße 15 ml; Sesamöl 1 TL; Ingwer 3 g', 'Glasnudeln einweichen, Gemüse im Wok anbraten, Nudeln zugeben, mit Soja und Sesamöl abschmecken.');
add('Zucchini-Zoodles', 'Zucchini 200 g; Olivenöl 1 EL; Knoblauch 1 Zehe; Salz 1 Prise', 'Zucchini zu Spiralen schneiden, 2 Min. in Öl mit Knoblauch schwenken (nicht verkochen).');
add(['Gemüselasagne', 'Mediterrane Gemüselasagne', 'Vegane Lasagne', 'Rinderhackfleischlasagne'], 'Lasagneplatten 40 g; Gemüse-/Hackfleischsoße 100 g; Béchamel 60 ml; Käse 20 g', 'Platten, Füllung und Béchamel schichten, mit Käse bestreuen, bei 180 °C 40 Min. backen, 10 Min. ruhen.');
add('Spinat-Ricotta-Cannelloni', 'Cannelloni 40 g; Spinat 60 g; Ricotta 70 g; Tomatensoße 80 g; Käse 20 g; Muskat 1 Prise', 'Spinat dünsten, mit Ricotta mischen, Röhren füllen, mit Tomatensoße und Käse überbacken, bei 180 °C 30 Min.');

// ---- Suppen & Eintöpfe (200 ml) ----
const creme = (names, gemuese, extra) => add(names, `${gemuese} 100 g; Kartoffel 30 g; Zwiebel 20 g; Butter 8 g; Gemüsefond 150 ml; Sahne 30 ml; ${extra}; Salz 1 Prise; Pfeffer 1 Prise`,
  'Zwiebel in Butter anschwitzen, Gemüse und Kartoffel kurz mitdünsten, mit Fond 20 Min. weich kochen, pürieren, Sahne zugeben, abschmecken.');
creme('Blumenkohlcremesuppe', 'Blumenkohl', 'Muskat 1 Prise');
creme('Brokkolicremesuppe', 'Brokkoli', 'Muskat 1 Prise');
creme('Champignoncremesuppe', 'Champignons', 'Thymian 1 Zweig');
creme(['Gemüsecremesuppe', 'Pürierter Gemüseeintopf'], 'Gemüse (gemischt)', 'Petersilie 2 g');
creme('Karottencremesuppe', 'Karotten', 'Orangensaft 10 ml');
creme('Karotten-Ingwersuppe', 'Karotten', 'Ingwer 5 g');
creme('Lauchcremesuppe', 'Lauch', 'Muskat 1 Prise');
creme('Spargelcremesuppe', 'Spargel', 'Zitronensaft 1 TL');
creme(['Kürbissuppe', 'Kokos-Kürbissuppe'], 'Hokkaido-Kürbis', 'Ingwer 3 g');
creme('Tomatencremesuppe', 'Tomaten (Dose)', 'Basilikum 3 g');
creme('Geröstete Tomaten-Paprika-Suppe', 'Tomaten und Paprika (geröstet)', 'Basilikum 3 g');
creme(['Kartoffel-Lauchsuppe', 'Kartoffel-Spinat-Suppe', 'Kartoffelsuppe', 'Vegane Kartoffelsuppe'], 'Kartoffeln', 'Majoran 1 g');
creme('Pürierter Erbseneintopf', 'Erbsen', 'Minze 1 g');
creme(['Waldpilzsuppe'], 'Waldpilze', 'Thymian 1 Zweig');
creme('Frankfurter Kräutersüppchen', 'Kräuter (gemischt)', 'Zitronensaft 1 TL');
creme(['Thailändische Gemüsesuppe', 'Currysuppe', 'Thailändische Geflügelsuppe'], 'Gemüse bzw. Hähnchen', 'Currypaste 8 g; Kokosmilch 50 ml');
add('Französische Zwiebelsuppe', 'Zwiebeln 100 g; Butter 10 g; Rinderfond 150 ml; Weißwein 30 ml; Baguette 20 g; Gruyère 20 g; Thymian 1 Zweig', 'Zwiebeln 25 Min. langsam karamellisieren, mit Wein ablöschen, Fond zugeben, 20 Min. köcheln, mit Baguette und Käse überbacken.');
add('Gazpacho Verde', 'Gurke 100 g; Paprika 30 g; Tomate (grün) 40 g; Olivenöl 10 ml; Essig 5 ml; Knoblauch 1 Zehe; Kräuter 5 g; Salz 1 Prise', 'Alles fein pürieren, passieren, kalt stellen, abschmecken.');
add(['Gemüsebrühe', 'Klare Gemüsebrühe'], 'Suppengemüse 80 g; Zwiebel 20 g; Wasser 220 ml; Lorbeerblatt 1 Stk; Salz 1 Prise; Pfefferkörner 3 Stk', 'Gemüse grob schneiden, mit Wasser und Gewürzen 45 Min. köcheln, abseihen, mit Einlage (Gemüse/Flädle) servieren.');
add('Rinderkraftbrühe', 'Rinderknochen/Suppenfleisch 100 g; Suppengemüse 60 g; Zwiebel 20 g; Wasser 250 ml; Lorbeerblatt 1 Stk; Salz 1 Prise', 'Fleisch und Knochen kalt ansetzen, 2–3 Std. leise köcheln, abschäumen, Gemüse zugeben, abseihen und klären; mit Markklößchen servieren.');
add(['Minestrone', 'Ribollita', 'Linseneintopf', 'Linsen-Eintopf', 'Bauerntopf', 'Orientalischer Gemüseeintopf', 'Sachsenhäuser Schneegestöber'], 'Gemüse (gewürfelt) 80 g; Hülsenfrüchte/Kartoffeln 40 g; Tomaten (Dose) 30 g; Gemüsefond 150 ml; Zwiebel 15 g; Olivenöl 1 TL; Salz 1 Prise', 'Zwiebel in Öl anschwitzen, Gemüse zugeben, mit Fond aufgießen, 30 Min. köcheln, abschmecken (Ribollita mit Brot andicken).');
add(['Gulaschsuppe', 'Gulaschsuppe vom Schwein'], 'Rind-/Schweinefleisch (gewürfelt) 60 g; Zwiebel 40 g; Paprika 20 g; Kartoffel 30 g; Tomatenmark 5 g; Paprikapulver 5 g; Brühe 150 ml; Öl 1 EL', 'Fleisch anbraten, Zwiebeln und Paprikapulver zugeben, mit Brühe 1 Std. köcheln, Kartoffeln zugeben und weich garen.');

// ---- Vegetarisch & Vegan ----
add(['Käsespätzle'], 'Spätzle 150 g; Käse (Bergkäse) 50 g; Röstzwiebeln 10 g; Butter 5 g', 'Spätzle schichtweise mit Käse in der Form mischen, bei 180 °C überbacken, mit Röstzwiebeln bestreuen.');
add(['Gemüse-Frikadelle', 'Veggie-Schnitzel', 'Gemüseschnitzel', 'Vegane Burger-Patty', 'Mini-Veggie-Burger'], 'Gemüse-/Veggiemasse 200 g; Paniermehl 30 g; Ei 0.5 Stk; Salz 1 Prise; Öl 40 ml', 'Masse formen, bei Bedarf panieren, goldbraun braten oder bei 190 °C 15 Min. backen.');
add(['Vegane Bratwurst'], 'Vegane Bratwurst 200 g; Öl 1 EL', 'Bei mittlerer Hitze 8–10 Min. braten oder grillen.');
add('Kartoffel-Spinat-Gratin', 'Kartoffeln 150 g; Spinat 40 g; Sahne 60 ml; Milch 40 ml; Käse 20 g; Knoblauch 1 Zehe; Muskat 1 Prise', 'Kartoffelscheiben mit Spinat schichten, mit Sahne-Milch-Guss übergießen, mit Käse bei 180 °C 45 Min. überbacken.');
add(['Serviettenknödel', 'Semmelknödel'], 'Brötchen/Knödelbrot 100 g; Milch 90 ml; Ei 1 Stk; Zwiebel 15 g; Petersilie 3 g; Butter 5 g; Salz 1 Prise; Muskat 1 Prise', 'Zwiebel und Petersilie in Butter dünsten, mit Milch, Ei und Gewürzen über das Brot geben, 15 Min. ziehen, formen, in Salzwasser 20 Min. garziehen.');
add('Reibekuchen', 'Kartoffeln 200 g; Ei 0.5 Stk; Zwiebel 20 g; Mehl 10 g; Salz 1 Prise; Öl 40 ml', 'Kartoffeln reiben, ausdrücken, mit Ei, Zwiebel, Mehl und Salz mischen, portionsweise flach in heißem Öl goldbraun ausbacken.');
add('Kaiserschmarrn', 'Mehl 60 g; Milch 90 ml; Eier 2 Stk; Zucker 25 g; Butter 20 g; Rosinen 15 g; Puderzucker 10 g; Salz 1 Prise', 'Teig aus Mehl, Milch, Eigelb, Salz; Eiweiß mit Zucker steif schlagen, unterheben, in Butter backen, wenden, zerreißen, karamellisieren.');
add(['Gefüllte Paprika', 'Paprikaschoten mit Gemüsefüllung', 'Gefüllte Paprika vegan', 'Gefüllte Spitzpaprika'], 'Paprika 120 g; Reis (gekocht) 50 g; Hack/Gemüse 50 g; Tomatensoße 60 g; Zwiebel 15 g; Käse 10 g', 'Paprika aushöhlen, mit Füllung belegen, in Tomatensoße bei 180 °C 35 Min. schmoren.');
add(['Gefüllte Zucchini', 'Gefüllte Auberginen', 'Zucchinischiffchen', 'Zucchini-Involtini', 'Zucchiniröllchen', 'Auberginenröllchen'], 'Zucchini/Aubergine 150 g; Frischkäse/Ricotta 40 g; Kräuter 3 g; Olivenöl 1 EL; Salz 1 Prise', 'Gemüse in Längsscheiben grillen bzw. aushöhlen, füllen, rollen und bei 180 °C 15 Min. überbacken.');
add(['Risotto', 'Kürbis-Risotto', 'Veganes Kürbis-Risotto', 'Risotto Primavera'], 'Risottoreis 70 g; Zwiebel 15 g; Weißwein 30 ml; Gemüsefond 250 ml; Butter 10 g; Parmesan 15 g; Olivenöl 1 TL', 'Zwiebel in Öl andünsten, Reis glasig rösten, mit Wein ablöschen, nach und nach heißen Fond zugeben (ca. 18 Min.), mit Butter und Parmesan binden.');
add('Auberginen-Parmigiana', 'Auberginen 130 g; Tomatensoße 80 g; Mozzarella 40 g; Parmesan 10 g; Olivenöl 15 ml; Basilikum 2 g', 'Auberginenscheiben anbraten, mit Tomatensoße, Mozzarella und Parmesan schichten, bei 190 °C 30 Min. überbacken.');
add('Halloumi', 'Halloumi 200 g; Olivenöl 1 EL; Honig 5 g', 'Halloumi in Scheiben schneiden, ohne Fett 2 Min. pro Seite goldbraun grillen.');
add(['Ofenkartoffel'], 'Kartoffeln (groß) 220 g; Öl 5 ml; Salz 1 Prise', 'Kartoffeln waschen, einstechen, mit Öl und Salz bei 200 °C 60 Min. backen, einschneiden.');
add(['Falafel', 'Mini-Falafel', 'Falafel-Waffel'], 'Kichererbsen (eingeweicht) 130 g; Zwiebel 20 g; Petersilie 8 g; Knoblauch 1 Zehe; Kreuzkümmel 2 g; Koriander 1 g; Mehl 10 g; Salz 1 Prise; Öl 40 ml', 'Alles grob im Cutter zerkleinern, 30 Min. ruhen, formen, bei 175 °C goldbraun frittieren.');
add(['Gemüse-Tajine', 'Orientalisches Schmorgemüse'], 'Gemüse (gewürfelt) 170 g; Kichererbsen 30 g; Zwiebel 20 g; Ras el Hanout 3 g; Tomaten 30 g; Gemüsefond 60 ml; Aprikosen 10 g; Olivenöl 1 EL', 'Zwiebel und Gewürz anrösten, Gemüse zugeben, mit Tomaten und Fond 30 Min. schmoren.');
add(['Shakshuka', 'Mediterrane Gemüse-Shakshuka'], 'Tomaten (Dose) 100 g; Paprika 40 g; Zwiebel 20 g; Eier 1 Stk; Kreuzkümmel 1 g; Paprikapulver 2 g; Knoblauch 1 Zehe; Öl 1 EL', 'Zwiebel, Paprika, Gewürze anrösten, Tomaten 10 Min. einkochen, Mulden formen, Eier einschlagen, zugedeckt stocken lassen.');
add('Gefüllte Weinblätter', 'Weinblätter 40 g; Reis 40 g; Zwiebel 20 g; Pinienkerne 5 g; Minze 2 g; Zitronensaft 10 ml; Olivenöl 10 ml', 'Reis mit Zwiebeln, Kräutern und Pinienkernen mischen, in Blätter wickeln, mit Zitronenwasser 40 Min. garen.');
add(['Linsen-Dal', 'Rotes Linsen-Dal', 'Kokos-Curry', 'Linsen-Kokos-Curry'], 'Rote Linsen 60 g; Kokosmilch 60 ml; Wasser 120 ml; Zwiebel 25 g; Ingwer 3 g; Knoblauch 1 Zehe; Curry 4 g; Spinat 20 g; Öl 1 EL', 'Zwiebel, Ingwer, Knoblauch und Curry in Öl rösten, Linsen, Wasser und Kokosmilch zugeben, 20 Min. köcheln, Spinat unterheben.');
add(['Kichererbsen-Curry', 'Kichererbsen-Spinat-Curry', 'Gemüse-Curry', 'Veganes Gemüse-Curry', 'Süßkartoffel-Curry', 'Grünes Gemüse-Curry', 'Kartoffelcurry', 'Paneer Tikka Masala'], 'Gemüse/Kichererbsen 130 g; Kokosmilch 70 ml; Currypaste 12 g; Zwiebel 20 g; Tomaten 30 g; Öl 1 EL; Salz 1 Prise', 'Zwiebel und Currypaste in Öl anrösten, Gemüse zugeben, mit Kokosmilch und Tomaten 15–20 Min. köcheln.');
add('Gebratener Tofu', 'Tofu 200 g; Sojasoße 15 ml; Speisestärke 8 g; Öl 1 EL; Sesam 3 g', 'Tofu pressen, würfeln, in Stärke wenden, knusprig braten, mit Sojasoße glasieren.');
add(['Tofu-Geschnetzeltes'], 'Tofu 200 g; Zwiebel 20 g; Paprika 30 g; Sojasoße 15 ml; Öl 1 EL', 'Tofu in Streifen schneiden, scharf anbraten, Gemüse zugeben, mit Soße vollenden.');
add(['Gemüse-Frühlingsrollen', 'Vegane Frühlingsrollen', 'Vietnamesische Summer Rolls'], 'Gemüse (Streifen) 100 g; Glasnudeln 20 g; Teigblätter 3 Stk; Sojasoße 5 ml; Öl 40 ml', 'Gemüse und Nudeln würzen, in Teigblätter einrollen, bei 175 °C goldbraun frittieren (Summer Rolls: Reispapier, ungebacken, kalt).');
add(['Gyoza', 'Pilz-Gyoza'], 'Gyozateig 80 g; Füllung (Gemüse/Pilze/Hack) 100 g; Sojasoße 5 ml; Öl 1 EL; Wasser 40 ml', 'Füllen, falten, unten anbraten, mit Wasser ablöschen und zugedeckt 4 Min. dämpfen.');
add(['Bohnen-Chili', 'Veganes Chili sin Carne', 'Chili sin Carne', 'Vegane Linsen-Bolognese'], 'Kidneybohnen 70 g; Mais 25 g; Tomaten (Dose) 90 g; Paprika 25 g; Zwiebel 25 g; Chili 2 g; Kreuzkümmel 2 g; Tomatenmark 8 g; Öl 1 EL', 'Zwiebel und Paprika anbraten, Gewürze und Tomatenmark rösten, mit Tomaten 30 Min. köcheln, Bohnen und Mais zugeben.');
add('Gemüse-Burrito', 'Wrap 1 Stk; Gemüse 80 g; Bohnen 40 g; Reis 30 g; Käse 15 g; Salsa 20 g', 'Füllung anbraten, im Wrap einrollen, kurz anbraten oder überbacken.');
add(['Gebackener Blumenkohl', 'Gerösteter Blumenkohl', 'Panierter Blumenkohl'], 'Blumenkohl 200 g; Olivenöl 1 EL; Paprikapulver 2 g; Salz 1 Prise', 'Blumenkohl in Röschen teilen (oder ganz), würzen, bei 210 °C 25–30 Min. rösten (paniert: vorher in Mehl-Ei-Brösel wenden).');
add('Vegane Gemüse-Pfanne', 'Gemüse (gemischt) 200 g; Öl 1 EL; Salz 1 Prise; Pfeffer 1 Prise; Kräuter 3 g', 'Gemüse in Stücke schneiden, in heißem Öl bissfest braten, würzen.');
add('Veganes Gulasch', 'Seitan/Pilze 80 g; Zwiebel 40 g; Paprika 30 g; Tomatenmark 8 g; Paprikapulver 6 g; Gemüsefond 100 ml; Öl 1 EL', 'Seitan anbraten, Zwiebel, Paprika und Gewürze zugeben, mit Fond 30 Min. köcheln.');
add('Veganes Pad Thai', 'Reisnudeln 50 g; Tofu 50 g; Sprossen 30 g; Erdnüsse 10 g; Tamarinde-Soße 25 ml; Sojasoße 10 ml; Limette 5 ml; Öl 1 EL', 'Nudeln einweichen, Tofu knusprig braten, Nudeln und Soße zugeben, Sprossen und Erdnüsse unterheben.');
add('Gemüse-Paella', 'Paellareis 60 g; Gemüse 60 g; Brühe 180 ml; Safran 1 Prise; Paprikapulver 2 g; Olivenöl 1 EL', 'Gemüse anbraten, Reis rösten, mit Safranbrühe 15 Min. garen, ruhen lassen.');
add(['Antipastiplatte'], 'Gegrilltes Gemüse 100 g; Getrocknete Tomaten 20 g; Eingelegte Artischocken 30 g; Oliven 20 g; Olivenöl 5 ml', 'Gemüse grillen, mit Öl marinieren, mit Oliven, Tomaten und Artischocken anrichten.');
add('Kartoffel-Rösti', 'Kartoffeln 200 g; Salz 1 Prise; Butterschmalz 20 g', 'Gekochte Kartoffeln reiben, salzen, portionsweise in Butterschmalz goldbraun braten.');
add('Gemüse-Biryani', 'Basmatireis 60 g; Gemüse 70 g; Biryani-Gewürz 5 g; Joghurt 20 g; Zwiebel 20 g; Cashews 8 g; Ghee 10 g', 'Gemüse mit Gewürz anbraten, mit vorgekochtem Reis schichten, zugedeckt bei 160 °C 25 Min. dämpfen.');
add(['Asiatische Reispfanne', 'Reispfanne', 'Bami Goreng', 'Crispy Rice'], 'Reis/Nudeln (gekocht) 120 g; Gemüse 60 g; Sojasoße 15 ml; Ei 0.5 Stk; Sesamöl 1 TL; Öl 1 EL', 'Reis/Nudeln im Wok scharf anbraten, Gemüse und Ei zugeben, mit Soja abschmecken.');
add(['Asiatisches Wokgemüse'], 'Gemüse (Streifen) 200 g; Sojasoße 15 ml; Knoblauch 1 Zehe; Ingwer 3 g; Öl 1 EL', 'Im Wok bei starker Hitze 3–4 Min. anbraten, mit Soja und Knoblauch abschmecken.');
add('Gekochte Eier', 'Eier 3 Stk; Wasser 1 l', 'Eier 8–9 Min. hart kochen, abschrecken und pellen.');
add('Gebratene Polenta-Schnitte', 'Polenta (gekocht, abgekühlt) 200 g; Öl 1 EL; Salz 1 Prise', 'Polenta in Scheiben schneiden, in Öl beidseitig goldbraun braten.');
add('Gebratenes Sellerie-Steak', 'Sellerie 200 g; Öl 1 EL; Salz 1 Prise; Thymian 1 Zweig; Butter 10 g', 'Sellerie in dicke Scheiben schneiden, 10 Min. blanchieren, in Öl und Butter goldbraun braten.');
add('Gegrillter Spitzkohl', 'Spitzkohl 200 g; Öl 1 EL; Salz 1 Prise', 'Kohl in Spalten schneiden, mit Öl bestreichen, auf dem Grill 3–4 Min. pro Seite rösten.');
add('Grüner Spargel', 'Grüner Spargel 200 g; Butter 10 g; Salz 1 Prise; Zitronensaft 1 TL', 'Untere Enden schälen, 3–4 Min. in Salzwasser garen oder in Butter braten.');
add('Ofen-Artischocke', 'Artischocken 200 g; Olivenöl 15 ml; Zitrone 10 g; Knoblauch 1 Zehe; Salz 1 Prise', 'Artischocken putzen, mit Zitrone, Knoblauch, Öl in Folie bei 190 °C 45 Min. garen.');
add(['Kartoffel-Gemüsepfanne', 'Kartoffel-Kürbis-Pfanne', 'Kartoffel-Waldpilzpfanne', 'Kartoffelpfanne'], 'Kartoffeln (gekocht) 110 g; Gemüse/Pilze 90 g; Zwiebel 15 g; Öl 1 EL; Kräuter 3 g; Salz 1 Prise', 'Kartoffeln in Öl knusprig anbraten, Gemüse zugeben, würzen, mit Kräutern abschmecken.');
add('Kichererbsen-Socca', 'Kichererbsenmehl 50 g; Wasser 80 ml; Olivenöl 10 ml; Salz 1 Prise', 'Mehl, Wasser, Öl glatt rühren, 30 Min. ruhen, dünn in heißer Pfanne backen bzw. bei 250 °C 10 Min. backen.');
add('Miso-glasierte Aubergine', 'Aubergine 200 g; Miso-Glasur 25 g; Öl 1 EL', 'Aubergine halbieren, einschneiden, braten, mit Glasur bestreichen und bei 220 °C 10 Min. karamellisieren.');
add('Ratatouillegemüse', 'Zucchini 60 g; Aubergine 50 g; Paprika 40 g; Tomaten 40 g; Zwiebel 15 g; Olivenöl 1 EL; Thymian 1 Zweig', 'Gemüse würfeln, nacheinander in Öl anbraten, mit Tomaten und Kräutern 20 Min. schmoren.');
add(['Eiersalat'], 'Eier 2 Stk; Mayonnaise 30 g; Joghurt 20 g; Schnittlauch 3 g; Senf 3 g; Salz 1 Prise', 'Eier hart kochen, würfeln, mit Mayonnaise-Joghurt-Dressing und Schnittlauch mischen.');
add(['Flambierter Kräutersaitling', 'Gebratene Champignons'], 'Pilze 200 g; Butter 10 g; Knoblauch 1 Zehe; Petersilie 3 g; Salz 1 Prise', 'Pilze in heißer Butter kräftig anbraten, Knoblauch zugeben, mit Petersilie bestreuen (Saitling flambiert mit Weinbrand).');
add(['Gefüllte Champignons', 'Capresespieße', 'Tomate-Mozzarella'], 'Zutaten 200 g; Olivenöl 5 ml; Basilikum 2 g; Salz 1 Prise', 'Champignons mit Frischkäse-Kräuter-Füllung bei 180 °C 12 Min. backen; Caprese: Tomate und Mozzarella aufspießen/schichten, mit Öl, Basilikum, Salz würzen.');
add(['Skyr-Panna-Cotta'], 'Skyr-Alternative 140 g; Sahne-Alternative 50 ml; Zucker 20 g; Gelatine/Agar 2 g', 'Zucker mit Gelatine in warmer Flüssigkeit lösen, Skyr unterrühren, in Gläser füllen, 4 Std. kühlen.');
add(['Asian-Style-Glas', 'Mexican-Style-Glas', 'Oriental-Style-Glas', 'Vegan-Style-Glas', 'Asiatischer Tofusalat'], 'Zutaten (gemischt) 200 g; Dressing 20 ml', 'Zutaten klein schneiden, schichten und mit passendem Dressing im Glas anrichten; kalt stellen.');

// ---- Backwaren, Quiches, Wraps ----
add(['Pizza Margherita', 'Pizza Verdura'], 'Pizzateig 100 g; Tomatensoße 60 g; Mozzarella 70 g; Basilikum 2 g; Olivenöl 5 ml', 'Teig ausrollen, mit Soße und Käse belegen, bei 250 °C 8–10 Min. backen, Basilikum zuletzt.');
add(['Veggie-Tacos', 'Veganer Taco', 'Blumenkohl-Tacos'], 'Taco-Schalen/Tortillas 2 Stk; Füllung 120 g; Salsa 30 g; Koriander 2 g', 'Füllung würzen und anbraten, in Tortillas anrichten, mit Salsa und Koriander servieren.');
add('Gedämpfte Bao Buns', 'Bao-Teig 80 g; Füllung 100 g; Hoisinsoße 15 g; Gurke 20 g', 'Buns 8–10 Min. dämpfen, mit Füllung und Hoisinsoße belegen.');
add('Geröstete Sauerteig-Tartine', 'Sauerteigbrot 60 g; Olivenöl 5 ml; Belag 120 g', 'Brot in Öl rösten, mit Belag anrichten.');
add(['Kartoffel-Gemüse-Strudel', 'Knuspriger Spinat-Feta-Börek'], 'Strudel-/Yufkateig 40 g; Füllung 150 g; Butter 10 g', 'Füllung auf Teig geben, einrollen, mit Butter bestreichen, bei 200 °C 25 Min. goldbraun backen.');
add(['Mini-Blätterteigpasteten', 'Mini-Blätterteigpastete', 'Mini-Pasteten', 'Mini-Pastete', 'Blätterteigschnecken'], 'Blätterteig 70 g; Füllung 100 g; Ei (Eigelb) 0.3 Stk', 'Blätterteig ausstechen/rollen, füllen, mit Eigelb bestreichen, bei 200 °C 15–18 Min. backen.');
add('Salzige Crêpes', 'Mehl 40 g; Milch 70 ml; Ei 0.5 Stk; Butter 5 g; Salz 1 Prise; Füllung 100 g', 'Teig glatt rühren, 20 Min. ruhen, dünne Crêpes backen, füllen und rollen.');
add(['Belegte Brötchen', 'Brötchen', 'Kanapees', 'Belegtes Steinofenbaguette', 'Mediterranes Focaccia-Sandwich'], 'Brötchen/Baguette 70 g; Aufstrich 15 g; Belag 70 g; Salat 10 g', 'Brot aufschneiden, mit Aufstrich bestreichen, belegen, ggf. in Häppchen schneiden und frisch halten.');
add(['Mini-Quiche', 'Französische Mini-Quiche'], 'Mürbeteig 50 g; Ei 1 Stk; Sahne 60 ml; Füllung 60 g; Salz 1 Prise; Muskat 1 Prise', 'Förmchen mit Teig auslegen, Füllung einlegen, mit Eier-Sahne-Guss füllen, bei 180 °C 20–25 Min. backen.');
add('Mini-Frittata', 'Eier 2 Stk; Milch 30 ml; Gemüse 60 g; Parmesan 10 g; Salz 1 Prise', 'Eier mit Milch und Gemüse verrühren, in Muffinformen bei 180 °C 15 Min. stocken lassen.');
add('Wraps', 'Wrap-Fladen 1 Stk; Füllung 120 g; Aufstrich 20 g', 'Fladen bestreichen, belegen, fest einrollen, schräg halbieren.');

// ---- Aufschnitt & Käse ----
add(['Aufschnitt', 'Wurstplatte', 'Käseplatte', 'Edelsalami', 'Salami', 'Schinken', 'Parmaschinken', 'Serranoschinken', 'Camembert', 'Edel-Schnittkäse', 'Schnittkäse', 'Käse', 'Fetakäse', 'Frischkäse', 'Kräuterfrischkäse', 'Steinpilz-Frischkäse', 'Spundekäs', 'Handkäs mit Musik', 'Handkäs-Tartar'],
  'Ware (Wurst/Käse) 200 g; Garnitur (Gurke, Tomate, Trauben) 30 g', 'Fertigprodukt – dünn aufschneiden bzw. portionieren, fächerförmig anrichten, kühl halten, mit Garnitur servieren.');
add('Panierter Hirtenkäse', 'Hirtenkäse 200 g; Mehl 20 g; Ei 1 Stk; Paniermehl 40 g; Öl 40 ml', 'Käse in Stücke schneiden, panieren (Mehl – Ei – Brösel), goldbraun ausbacken.');
add('Datteln im Speckmantel', 'Datteln 100 g; Bacon 60 g', 'Datteln mit Bacon umwickeln, bei 200 °C 12 Min. backen.');
add('Melonenbällchen im Parmaschinkenmantel', 'Melone 120 g; Parmaschinken 40 g', 'Melone ausstechen, mit Schinken umwickeln, kalt anrichten.');
add(['Gebackener Schafskäse'], 'Schafskäse 200 g; Olivenöl 10 ml; Thymian 1 Zweig', 'Käse mit Öl und Kräutern bei 200 °C 10 Min. goldbraun überbacken.');
add('Mozzarella-Frischkäse-Mousse', 'Mozzarella 80 g; Frischkäse 90 g; Sahne 30 ml; Basilikum 2 g', 'Mozzarella pürieren, mit Frischkäse und Würze mischen, geschlagene Sahne unterheben, kalt stellen.');
add(['Ziegenkäse-Crème Brûlée', 'Ziegenkäsebällchen'], 'Ziegenkäse 120 g; Sahne 70 ml; Eigelb 1 Stk; Zucker 5 g', 'Ziegenkäse mit Sahne und Eigelb verrühren, bei 120 °C 25 Min. stocken lassen, kühlen, mit Zucker karamellisieren (Bällchen: formen und panieren).');
module.exports = R;
