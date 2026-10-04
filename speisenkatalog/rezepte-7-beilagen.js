// Standardrezepte Beilagen (Kartoffeln, Reis, Nudeln, Brot) und Gemüse/Salate – Bezugsmenge 200 g Rohware.
const R = [];
const add = (names, z, s) => R.push({ names: [].concat(names), z, s });

// ---- Reis, Nudeln, Getreide (200 g roh) ----
add(['Reis', 'Langkornreis', 'Basmatireis', 'Jasminreis', 'Duftreis', 'Gelber Reis', 'Butterreis', 'Schwarzer Reis', 'Wildreis', 'Sushireis'], 'Reis (roh) 200 g; Wasser 360 ml; Salz 4 g; Butter/Öl 5 g',
  'Reis waschen, mit Wasser und Salz aufkochen, zugedeckt bei kleinster Hitze 12–15 Min. quellen lassen (Wildreis/Schwarzer Reis: ca. 35 Min.), mit Butter lockern.');
add('Mediterraner Reis', 'Reis (roh) 200 g; Wasser 360 ml; Tomaten (getrocknet) 15 g; Oliven 10 g; Olivenöl 10 ml; Kräuter 4 g; Salz 4 g', 'Reis in Öl andünsten, mit Wasser garen, getrocknete Tomaten, Oliven und Kräuter unterheben.');
add(['Butternudeln', 'Bandnudeln', 'Spaghetti', 'Tagliatelle', 'Penne'], 'Nudeln (roh) 200 g; Wasser 2 l; Salz 18 g; Butter 10 g', 'Nudeln in kräftig gesalzenem Wasser al dente kochen, abgießen, mit Butter schwenken.');
add(['Spätzle', 'Butterspätzle'], 'Mehl 140 g; Eier 2 Stk; Wasser 60 ml; Salz 2 g; Butter 10 g', 'Teig aus Mehl, Eiern, Wasser, Salz kräftig schlagen, 10 Min. ruhen, durch Presse in siedendes Salzwasser geben, abschöpfen, in Butter schwenken.');
add('Polenta', 'Polenta (Grieß) 60 g; Wasser/Brühe 280 ml; Butter 8 g; Parmesan 10 g; Salz 2 g', 'Flüssigkeit aufkochen, Polenta einrühren, 10–15 Min. ausquellen lassen, mit Butter und Käse abschmecken.');
add('Couscous', 'Couscous 200 g; Brühe (heiß) 200 ml; Olivenöl 10 ml; Salz 2 g', 'Couscous mit Öl und Salz mischen, mit heißer Brühe übergießen, zugedeckt 5 Min. quellen, mit Gabel lockern.');
add('Orientalische Couscous-Pfanne', 'Couscous 100 g; Gemüse 70 g; Kichererbsen 30 g; Brühe 100 ml; Ras el Hanout 2 g; Olivenöl 10 ml', 'Gemüse anbraten, Couscous mit heißer Brühe quellen lassen, untermischen, würzen.');
add('Bulgur', 'Bulgur 200 g; Wasser/Brühe 300 ml; Salz 2 g; Olivenöl 10 ml', 'Bulgur mit Flüssigkeit und Salz 10 Min. köcheln, 5 Min. quellen, auflockern.');
add('Quinoa', 'Quinoa 200 g; Wasser 400 ml; Salz 3 g', 'Quinoa heiß abspülen, mit Wasser aufkochen, 15 Min. köcheln, 5 Min. quellen.');
add('Gnocchi', 'Gnocchi (frisch) 200 g; Butter 10 g; Salz 2 g', 'In Salzwasser garen bis sie aufsteigen, abtropfen, in Butter anbraten.');
add('Glasnudeln', 'Glasnudeln (roh) 200 g; Wasser (heiß) 1 l; Sesamöl 5 ml', 'Mit heißem Wasser übergießen, 5–8 Min. ziehen lassen, abgießen, mit Sesamöl mischen.');
add('Risotto', 'Risottoreis 200 g; Zwiebel 40 g; Weißwein 80 ml; Gemüsefond 700 ml; Butter 25 g; Parmesan 40 g; Olivenöl 10 ml', 'Zwiebel in Öl andünsten, Reis glasig rösten, mit Wein ablöschen, heißen Fond nach und nach zugeben (18 Min.), mit Butter und Parmesan binden.');

// ---- Kartoffeln (200 g roh) ----
add(['Salzkartoffeln', 'Pellkartoffeln', 'Petersilienkartoffeln', 'Kräuterkartoffeln', 'Drillinge'], 'Kartoffeln 200 g; Wasser 400 ml; Salz 4 g; Petersilie 3 g; Butter 5 g', 'Kartoffeln schälen (Pellkartoffeln mit Schale), in Salzwasser 20–25 Min. garen, abgießen, ausdampfen, mit Butter und Petersilie schwenken.');
add(['Rosmarinkartoffeln', 'Röstkartoffeln', 'Ofenkartoffeln', 'Gebackene Kartoffeln', 'Marinierte Backkartoffeln', 'Wedges'], 'Kartoffeln 200 g; Olivenöl 10 ml; Rosmarin 1 Zweig; Knoblauch 1 Zehe; Salz 2 g; Paprikapulver 1 g', 'Kartoffeln waschen, in Spalten schneiden, mit Öl und Gewürzen mischen, bei 200 °C 35–40 Min. backen, einmal wenden.');
add(['Kartoffelpüree', 'Kartoffelstampf'], 'Kartoffeln 200 g; Milch 50 ml; Butter 20 g; Muskat 1 Prise; Salz 3 g', 'Kartoffeln weich kochen, abdämpfen, durch die Presse drücken, mit heißer Milch und Butter glatt rühren, würzen.');
add('Süßkartoffelpüree', 'Süßkartoffeln 200 g; Butter 15 g; Sahne 30 ml; Salz 2 g; Muskat 1 Prise', 'Süßkartoffeln weich garen, pürieren, mit Butter und Sahne glatt rühren.');
add('Kartoffelgratin', 'Kartoffeln 200 g; Sahne 50 ml; Milch 40 ml; Knoblauch 1 Zehe; Muskat 1 Prise; Butter 5 g; Käse 20 g; Salz 2 g', 'Kartoffeln in dünne Scheiben hobeln, in Form schichten, mit gewürztem Sahne-Milch-Guss übergießen, bei 180 °C 50 Min. backen.');
add(['Pommes frites', 'Kroketten'], 'Pommes/Kroketten (TK) 200 g; Öl zum Frittieren 40 ml; Salz 2 g', 'Bei 175 °C 3–4 Min. goldgelb frittieren (oder bei 200 °C 20 Min. backen), salzen.');
add(['Serviettenknödel', 'Kartoffelknödel', 'Kartoffelklöße', 'Semmelknödel'], 'Kartoffeln (roh/gekocht) 200 g; Stärke 25 g; Ei 0.5 Stk; Salz 2 g; Muskat 1 Prise', 'Kartoffeln reiben bzw. pressen, mit Stärke, Ei und Gewürzen zu Teig verkneten, Klöße formen, in siedendem Salzwasser 20 Min. garziehen.');
add('Herzoginkartoffeln', 'Kartoffeln 200 g; Eigelb 0.5 Stk; Butter 15 g; Muskat 1 Prise; Salz 2 g', 'Kartoffeln kochen, pressen, mit Eigelb, Butter, Gewürzen mischen, Rosetten spritzen, bei 200 °C 15 Min. goldbraun backen.');
add('Bratkartoffeln', 'Kartoffeln (gekocht) 200 g; Zwiebel 25 g; Speck 15 g; Butterschmalz 15 g; Salz 2 g; Majoran 1 g', 'Kartoffelscheiben in Butterschmalz knusprig braten, Zwiebel und Speck zugeben, würzen.');
add(['Kartoffelsalat', 'Spanischer Kartoffelsalat', 'Kartoffel-Gurkensalat', 'Kartoffel-Kürbissalat'], 'Kartoffeln 200 g; Zwiebel 20 g; Brühe 50 ml; Essig 15 ml; Öl 15 ml; Senf 5 g; Salz 2 g; Pfeffer 1 Prise', 'Kartoffeln kochen, noch warm schneiden, mit heißer Brühe-Essig-Marinade, Zwiebeln und Öl mischen, 1 Std. ziehen lassen.');
add('Rösti', 'Kartoffeln 200 g; Butterschmalz 20 g; Salz 2 g', 'Gekochte Kartoffeln reiben, salzen, portionsweise in Butterschmalz goldbraun braten.');

// ---- Brot ----
add(['Baguette', 'Ciabatta', 'Fladenbrot', 'Brot', 'Toast', 'Brötchen', 'Bagel', 'Laugenstangen', 'Brotauswahl'], 'Brot/Gebäck (TK oder Teigling) 200 g', 'Backwaren nach Packungsangabe bei 180–200 °C aufbacken (ca. 8–12 Min.), abkühlen lassen, aufschneiden und im Korb anrichten.');
add(['Pumpernickel', 'Pumpernickeltaler', 'Vollkorntaler'], 'Pumpernickel/Vollkornbrot 200 g', 'Fertigprodukt – in Scheiben oder Taler schneiden, ggf. ausstechen.');

// ---- Gemüse (200 g roh) ----
const gem = (names, gemuese, extra, schritt) => add(names, `${gemuese} 200 g; Butter/Öl 10 g; Salz 2 g; ${extra}`, schritt);
gem(['Brokkoli', 'Blumenkohl', 'Brokkolini', 'Romanesco'], 'Gemüse', 'Wasser 500 ml; Muskat 1 Prise', 'Röschen in kochendem Salzwasser 4–6 Min. bissfest garen (oder dämpfen), abschrecken, in Butter schwenken.');
gem(['Erbsen', 'Prinzessbohnen', 'Grüne Bohnen', 'Edamame'], 'Gemüse (TK/frisch)', 'Bohnenkraut 1 g', 'In Salzwasser 5–8 Min. bissfest garen, abschrecken, in Butter schwenken, würzen.');
gem(['Spinat', 'Blattspinat', 'Rahmspinat'], 'Blattspinat', 'Knoblauch 1 Zehe; Sahne 30 ml; Muskat 1 Prise', 'Spinat in Butter mit Knoblauch zusammenfallen lassen, würzen (Rahmspinat: mit Sahne 3 Min. köcheln).');
gem('Spargel', 'Spargel', 'Zucker 1 Prise; Zitronensaft 1 TL', 'Spargel schälen, in Wasser mit Salz, Zucker, Butter 10–12 Min. garen.');
gem(['Rotkohl', 'Blaukraut', 'Apfelrotkohl'], 'Rotkohl', 'Apfel 40 g; Zwiebel 20 g; Rotwein 30 ml; Essig 10 ml; Zucker 8 g; Nelke 1 Stk; Lorbeerblatt 1 Stk', 'Kohl hobeln, mit Zwiebel und Apfel in Fett andünsten, mit Wein und Essig ablöschen, Gewürze zugeben, 45–60 Min. schmoren.');
gem(['Sauerkraut'], 'Sauerkraut', 'Zwiebel 20 g; Wacholder 2 Stk; Lorbeerblatt 1 Stk; Apfel 20 g', 'Zwiebel in Fett andünsten, Kraut und Gewürze zugeben, 30–40 Min. weich köcheln.');
gem(['Rosenkohl'], 'Rosenkohl', 'Muskat 1 Prise', 'Rosenkohl putzen, 8–10 Min. in Salzwasser garen, in Butter schwenken (oder rösten).');
gem(['Rahmwirsing'], 'Wirsing', 'Sahne 50 ml; Zwiebel 15 g; Muskat 1 Prise', 'Wirsing in Streifen schneiden, mit Zwiebel andünsten, mit Sahne 10 Min. garen, würzen.');
gem(['Pak Choi', 'Chinakohl-Gemüse', 'Wokgemüse', 'Asiatisches Wokgemüse'], 'Gemüse', 'Sojasoße 10 ml; Knoblauch 1 Zehe; Ingwer 2 g', 'Im Wok bei starker Hitze 3–4 Min. anbraten, mit Soja, Knoblauch und Ingwer abschmecken.');
gem(['Kohlrabi', 'Babykarotten-Kohlrabigemüse'], 'Kohlrabi', 'Sahne 30 ml; Petersilie 2 g', 'Kohlrabi schälen, in Stifte schneiden, in Butter mit etwas Wasser 8 Min. dünsten, mit Sahne und Petersilie abschmecken.');
gem(['Honig-Karotten', 'Karotten', 'Babykarotten', 'Karotten-Erbsen-Gemüse', 'Karotten-Kichererbsen-Gemüse'], 'Karotten', 'Honig 5 g; Petersilie 2 g', 'Karotten schälen, in Butter anschwitzen, mit etwas Wasser 8–10 Min. garen, mit Honig glasieren, mit Petersilie bestreuen.');
gem(['Gurken-Dill-Gemüse'], 'Salatgurke', 'Dill 3 g; Sahne 30 ml', 'Gurke schälen, in Butter 3 Min. dünsten, mit Sahne und Dill abschmecken.');
gem('Fenchel', 'Fenchel', 'Weißwein 20 ml', 'Fenchel vierteln, in Butter anbraten, mit Wein ablöschen, 12 Min. dünsten.');
gem(['Wurzelgemüse', 'Pastinaken-Möhren-Stampf', 'Steckrüben'], 'Wurzelgemüse', 'Muskat 1 Prise', 'Gemüse schälen, würfeln, in Salzwasser 15–20 Min. garen, abgießen, stampfen bzw. in Butter schwenken.');
gem(['Rote Bete'], 'Rote Bete', 'Essig 5 ml; Kümmel 1 g', 'Rote Bete 40–50 Min. kochen (oder bei 180 °C backen), pellen, in Scheiben schneiden, mit Essig würzen.');
gem('Kürbis', 'Hokkaido-Kürbis', 'Olivenöl 10 ml; Thymian 1 Zweig', 'Kürbis würfeln, mit Öl und Gewürzen bei 200 °C 25 Min. rösten.');
gem(['Lauch-Rahmgemüse', 'Lauchgemüse'], 'Lauch', 'Sahne 50 ml; Muskat 1 Prise', 'Lauch in Ringe schneiden, in Butter 5 Min. dünsten, mit Sahne 5 Min. köcheln, würzen.');
gem(['Gegrillter Maiskolben', 'Maiskolben'], 'Maiskolben', 'Butter 10 g', 'Maiskolben 10 Min. kochen oder 12 Min. grillen, mit Butter und Salz bestreichen.');
gem('Zucchini', 'Zucchini', 'Knoblauch 1 Zehe; Thymian 1 Zweig', 'Zucchini in Scheiben schneiden, in heißem Öl 3–4 Min. anbraten, würzen.');
gem(['Mediterranes Ofengemüse', 'Gegrilltes mediterranes Gemüse', 'Grillgemüse', 'Gebratenes Gemüse (Zucchini, Aubergine, Paprika)', 'Gegrillter Gemüsesalat', 'Orientalisches Ofengemüse', 'Glasiertes Gemüse'], 'Gemüse (Zucchini, Aubergine, Paprika)', 'Olivenöl 10 ml; Kräuter 3 g', 'Gemüse in Stücke schneiden, mit Öl und Gewürzen bei 200 °C 20–25 Min. rösten oder auf dem Grill 3–4 Min. pro Seite grillen.');
gem(['Paprikagemüse', 'Auberginengemüse', 'Aprikosen-Gemüse', 'Apfelgemüse', 'Gewürzgurken-Gemüse', 'Pilzgemüse', 'Shiitake-Pilzgemüse', 'Gemüse-Curry', 'Gemischtes Gemüse', 'Bunte Gemüseauswahl', 'Gemüseeinlage', 'Kichererbsen-Gemüse'], 'Gemüse (gemischt)', 'Kräuter 3 g', 'Gemüse in Stücke schneiden, in Fett anbraten bzw. dünsten, bissfest garen, würzen und mit Kräutern abschmecken.');
add('Ratatouille', 'Zucchini 60 g; Aubergine 50 g; Paprika 40 g; Tomaten 40 g; Zwiebel 15 g; Olivenöl 10 ml; Thymian 1 Zweig; Salz 2 g', 'Gemüse würfeln, nacheinander in Öl anbraten, mit Tomaten und Kräutern 20 Min. schmoren.');
add(['Cherrytomaten', 'Kirschtomaten', 'Cocktailtomaten', 'Geschmorte Tomaten'], 'Tomaten (klein) 200 g; Olivenöl 10 ml; Thymian 1 Zweig; Salz 2 g', 'Tomaten mit Öl und Kräutern bei 180 °C 12 Min. schmoren oder in der Pfanne schwenken.');
add(['Kidneybohnen', 'Schwarze Bohnen'], 'Bohnen (Dose) 200 g; Salz 1 g', 'Bohnen abspülen, erhitzen, würzen (Trockenware: über Nacht einweichen, 60–90 Min. kochen).');
add(['Rohkoststicks', 'Gemüsesticks', 'Gurke'], 'Gemüse (Gurke, Karotte, Sellerie, Paprika) 200 g', 'Gemüse waschen, in Sticks schneiden, kalt stellen, mit Dip servieren.');
add('Kaiserschoten', 'Kaiserschoten 200 g; Butter 5 g; Salz 2 g', 'Schoten 2–3 Min. blanchieren, in Butter schwenken.');
add('Rote-Bete-Carpaccio', 'Rote Bete (gegart) 200 g; Olivenöl 10 ml; Essig 5 ml; Salz 1 Prise', 'Rote Bete garen, hauchdünn schneiden, mit Öl, Essig und Salz marinieren.');
add('Paprika', 'Paprika 200 g; Olivenöl 10 ml; Salz 2 g', 'Paprika in Streifen schneiden, in Öl anbraten oder bei 220 °C rösten, würzen.');
add('Rucola', 'Rucola 200 g', 'Rucola waschen, trocken schleudern, kühl lagern, erst kurz vor dem Servieren anmachen.');

// ---- Salate ----
const salat = (names, zutaten, schritt) => add(names, `${zutaten}; Dressing 25 ml; Salz 1 Prise`, schritt);
salat(['Gurkensalat'], 'Gurke 190 g; Dill 2 g', 'Gurke hobeln, salzen und kurz ziehen lassen, mit Dressing und Dill mischen.');
salat(['Krautsalat'], 'Weißkohl 190 g; Karotte 10 g; Kümmel 1 g', 'Kohl fein hobeln, salzen und mit den Händen kneten, mit Essig-Öl-Dressing 1 Std. ziehen lassen.');
salat(['Griechischer Salat', 'Griechischer Bauernsalat', 'Bauernsalat'], 'Tomaten 80 g; Gurke 60 g; Paprika 20 g; Feta 30 g; Oliven 10 g; Rote Zwiebel 10 g', 'Gemüse grob würfeln, mit Feta und Oliven anrichten, mit Dressing und Oregano anmachen.');
salat(['Blattsalat', 'Blattsalate', 'Gemischte Blattsalate', 'Beilagensalat', 'Eisbergsalat', 'Feldsalat', 'Rucolasalat', 'Kräutersalat'], 'Blattsalat 170 g; Tomate 15 g; Gurke 15 g', 'Salate waschen, trocken schleudern, zerzupfen, kurz vor dem Servieren mit Dressing anmachen.');
salat(['Orientalischer Salat', 'Arabischer Couscoussalat', 'Orientalischer Couscoussalat', 'Mediterraner Couscoussalat', 'Couscoussalat', 'Tabouleh-Salat'], 'Couscous (gequollen) 130 g; Gemüse 50 g; Kichererbsen 20 g; Kräuter 8 g; Zitronensaft 10 ml', 'Couscous quellen lassen, auskühlen, mit Gemüse, Kräutern und Dressing mischen, 1 Std. ziehen lassen.');
salat(['Bunter Quinoasalat'], 'Quinoa (gekocht) 120 g; Gemüse 60 g; Cranberries 10 g', 'Quinoa kochen, abkühlen, mit Gemüse und Dressing mischen.');
salat('Capresesalat', 'Tomaten 110 g; Mozzarella 80 g; Basilikum 3 g', 'Tomaten und Mozzarella in Scheiben schneiden, fächern, mit Basilikum, Salz und Öl anmachen.');
salat(['Frankfurter Nudelsalat', 'Mediterraner Nudelsalat', 'Mediterraner Pasta-Salat'], 'Nudeln (gekocht) 130 g; Gemüse/Wurst 60 g; Mayonnaise/Dressing 10 g', 'Nudeln al dente kochen, abkühlen, mit Zutaten und Dressing mischen, 2 Std. durchziehen lassen.');
salat('Frischer Wassermelonen-Hirtenkäse-Salat', 'Wassermelone 130 g; Hirtenkäse 40 g; Gurke 20 g; Minze 2 g', 'Melone würfeln, mit Käse, Gurke, Minze und Limettenvinaigrette mischen.');
salat('Handkäs-Salat', 'Handkäse 120 g; Zwiebel 30 g; Cornichons 20 g; Kümmel 1 g', 'Käse würfeln, mit Zwiebeln, Gurken und Kümmel-Senf-Marinade 1 Std. marinieren.');
salat(['Karottensalat', 'Marinierter Rotkohlsalat', 'Rote-Bete-Salat', 'Fenchel-Orangen-Salat', 'Gurken-Ingwersalat', 'Gurken-Ingwer-Salat', 'Avocado-Gurkensalat', 'Ananas-Gurken-Salat', 'Tomatensalat', 'Tomaten-Gurken-Salat', 'Mediterraner Gemüsesalat', 'Frischer Melonensalat', 'Oliven-Schafskäse-Salat'], 'Gemüse/Obst 190 g; Kräuter 3 g', 'Zutaten fein schneiden bzw. hobeln, mit Dressing mischen, 30 Min. durchziehen lassen.');
salat(['Vietnamesischer Mie-Nudelsalat', 'Asiatischer Mienudelsalat'], 'Mie-Nudeln (gekocht) 120 g; Gemüse 50 g; Koriander 5 g; Sojasoße 10 ml; Limettensaft 5 ml', 'Nudeln kochen, abschrecken, mit Gemüse, Koriander und Dressing mischen.');
salat(['Avocadosalat', 'Mexikanischer Avocadosalat', 'Mexikanischer Bohnen-Mais-Salat'], 'Avocado/Bohnen/Mais 170 g; Tomate 20 g; Koriander 3 g; Limettensaft 10 ml', 'Zutaten würfeln, mit Limette, Koriander und Salz mischen, sofort servieren.');
salat(['Orientalischer Linsensalat'], 'Linsen (gekocht) 140 g; Rosinen 10 g; Sesam 5 g; Kräuter 5 g; Zitronensaft 10 ml', 'Linsen kochen, abkühlen, mit Rosinen, Kräutern und Dressing mischen.');
salat('Kartoffel-Kürbissalat', 'Kartoffeln 100 g; Kürbis 80 g; Linsen 20 g', 'Kürbis rösten, Kartoffeln kochen, mit Linsen und Dressing mischen.');
module.exports = R;
