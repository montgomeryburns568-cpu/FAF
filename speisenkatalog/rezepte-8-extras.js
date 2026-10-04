// Standardzubereitung Extras/Toppings/Beigaben – Bezugsmenge 200 g.
const R = [];
const add = (names, z, s) => R.push({ names: [].concat(names), z, s });

// ---- Nüsse, Kerne, Saaten ----
add(['Pinienkerne', 'Geröstete Pinienkerne', 'Geröstete Erdnüsse', 'Erdnüsse', 'Geröstete Kürbiskerne', 'Kürbiskerne', 'Geröstete Walnüsse', 'Walnuss', 'Geröstete Mandeln', 'Mandeln', 'Geröstete Haselnüsse', 'Haselnuss', 'Geröstete Cashewkerne', 'Cashewkerne', 'Sonnenblumenkerne', 'Geröstete Saaten', 'Pistazien'],
  'Nüsse/Kerne 200 g; Salz 1 Prise', 'Ohne Fett in der Pfanne bei mittlerer Hitze 3–5 Min. rösten (oder bei 160 °C 6–8 Min. im Ofen), ständig bewegen, auskühlen lassen, ggf. grob hacken.');
add(['Sesam', 'Schwarzer Sesam', 'Weißer Sesam'], 'Sesam 200 g', 'Ohne Fett in der Pfanne 2–3 Min. goldgelb rösten, sofort aus der Pfanne nehmen.');
add(['Karamellisierte Walnüsse'], 'Walnüsse 150 g; Zucker 50 g; Butter 5 g', 'Zucker karamellisieren, Walnüsse und Butter zugeben, schwenken, auf Backpapier auskühlen lassen.');
add(['Sesamkruste', 'Sesampanade'], 'Sesam 150 g; Paniermehl 50 g; Salz 1 Prise', 'Sesam und Brösel mischen; Fisch/Fleisch/Käse zuerst in Mehl und Ei wenden, dann in der Mischung panieren, goldbraun braten.');
add('Schoko-Haselnuss-Kruste', 'Zucker 100 g; Haselnüsse 70 g; Kakao 10 g; Wasser 20 ml', 'Zucker karamellisieren, Nüsse zugeben, auf Backpapier erstarren lassen, fein hacken, auf Creme streuen und abflämmen.');
add('Sultaninen', 'Sultaninen/Rosinen 200 g', 'Bei Bedarf kurz in warmem Wasser oder Saft einweichen, abtropfen.');
add('Rosinen', 'Rosinen 200 g', 'Bei Bedarf kurz in warmem Wasser oder Saft einweichen, abtropfen.');
add('Croutons', 'Toastbrot 200 g; Olivenöl 20 ml; Knoblauch 1 Zehe; Salz 1 Prise', 'Brot würfeln, mit Knoblauchöl und Salz mischen, bei 180 °C 10 Min. knusprig backen.');
add(['Kokos', 'Kokosnussmilch'], 'Kokosraspeln/Kokosmilch 200 g', 'Kokosraspeln ohne Fett kurz rösten; Kokosmilch vor Gebrauch gut schütteln oder aufrühren.');

// ---- Kräuter, Gewürze, Zitrus ----
add(['Basilikum', 'Dill', 'Estragon', 'Gartenkräuter', 'Gehackte Petersilie', 'Kerbel', 'Koriander', 'Kräuter', 'Majoran', 'Minze', 'Petersilie', 'Salbei', 'Schnittlauch', 'Thai-Basilikum', 'Thymian', 'Rosmarin', 'Wildkräuter', 'Kresse'],
  'Frische Kräuter 200 g', 'Kräuter waschen, trocken schleudern, Blätter abzupfen und erst kurz vor dem Servieren hacken bzw. schneiden (Schnittlauch in Röllchen), kühl und feucht lagern.');
add(['Sprossen'], 'Sprossen 200 g', 'Kurz waschen, gut abtropfen, kühl lagern, erst vor dem Servieren verwenden.');
add(['Zitrone', 'Zitronenspalte', 'Limette', 'Limettensaft', 'Yuzu'], 'Zitrusfrüchte 200 g', 'Heiß waschen, Spalten schneiden bzw. Saft pressen, Abrieb vor dem Pressen nehmen; kühl lagern.');
add(['Chili', 'Peperoncini'], 'Chili/Peperoncini 200 g', 'Chili waschen, entkernen (Handschuhe!), je nach Bedarf in Ringe oder fein schneiden.');
add(['Ingwer'], 'Ingwer 200 g', 'Ingwer schälen (Löffelkante), fein reiben oder in feine Streifen schneiden.');
add(['Wasabi'], 'Wasabipaste 200 g', 'Fertigprodukt – portionieren, kühl lagern, sparsam dosieren.');
add(['Safran'], 'Safranfäden 2 g; Wasser (warm) 30 ml', 'Safranfäden in warmem Wasser 15 Min. ziehen lassen und samt Wasser verwenden.');
add(['Kümmel', 'Salz', 'Meersalz'], 'Gewürz 200 g', 'Fertigprodukt – bei Bedarf kurz anrösten (Kümmel) bzw. in Gewürzschalen portionieren.');
add('Dukkah', 'Haselnüsse 80 g; Sesam 40 g; Koriandersamen 20 g; Kreuzkümmel 10 g; Salz 4 g; Pfeffer 2 g', 'Nüsse und Gewürze getrennt rösten, grob mörsern, mischen.');
add('Kräuterkruste', 'Paniermehl 120 g; Kräuter 40 g; Butter 40 g; Knoblauch 1 Zehe; Salz 2 g', 'Alle Zutaten vermengen, auf das Gargut drücken, bei 200 °C 8–10 Min. goldbraun überbacken.');

// ---- Gemüse-Toppings, Eingelegtes ----
add(['Oliven', 'Grüne Oliven', 'Schwarze Oliven', 'Marinierte Oliven'], 'Oliven 200 g; Olivenöl 10 ml; Kräuter 2 g', 'Oliven abtropfen, mit Öl und Kräutern marinieren, ggf. entsteinen.');
add('Gebratene Oliven', 'Oliven 200 g; Olivenöl 10 ml; Thymian 1 Zweig', 'Oliven abtropfen, in heißem Öl 3 Min. anbraten, mit Thymian würzen.');
add(['Cornichons', 'Eingelegter Rettich', 'Eingelegte Artischocken'], 'Eingelegtes Gemüse 200 g', 'Fertigprodukt – abtropfen, ggf. halbieren oder in Scheiben schneiden, kühl servieren.');
add('Röstzwiebeln', 'Röstzwiebeln 200 g', 'Fertigprodukt – kurz vor dem Servieren aufstreuen, damit sie knusprig bleiben.');
add(['Schmorzwiebeln', 'Zwiebeln', 'Rote Zwiebeln'], 'Zwiebeln 200 g; Öl 10 ml; Zucker 3 g; Salz 1 Prise', 'Zwiebeln in Streifen schneiden, in Öl langsam 15–20 Min. goldbraun schmoren, mit Zucker und Salz abschmecken (Rohe Zwiebeln: fein würfeln bzw. in Ringe schneiden).');
add(['Getrocknete Tomaten'], 'Getrocknete Tomaten 200 g; Olivenöl 10 ml', 'Falls nicht in Öl: kurz in heißem Wasser einweichen, abtropfen, in Streifen schneiden, mit Öl mischen.');
add(['Balsamico-Kirschtomaten', 'Geschmorte Kirschtomate', 'Geschmorte Mini-Tomate'], 'Kirschtomaten 200 g; Olivenöl 10 ml; Balsamico 10 ml; Thymian 1 Zweig; Salz 1 Prise', 'Tomaten in Öl 3–4 Min. schwenken bzw. bei 180 °C 10 Min. schmoren, mit Balsamico ablöschen.');
add(['Tomate', 'Tomaten', 'Gurken', 'Karotte', 'Radieschen', 'Lauch', 'Frühlingslauch'], 'Gemüse 200 g', 'Gemüse waschen, putzen und in Scheiben, Würfel oder feine Streifen schneiden; kühl lagern und erst kurz vor dem Servieren anrichten.');
add(['Geröstete Paprika'], 'Paprika 200 g; Olivenöl 10 ml; Salz 1 Prise', 'Paprika bei 230 °C 20 Min. rösten bis die Haut schwarz wird, in einer Schüssel abgedeckt auskühlen, häuten, in Streifen schneiden, mit Öl marinieren.');
add(['Kichererbsen', 'Rote Linsen', 'Belugalinsen', 'Mais'], 'Hülsenfrüchte/Mais (Dose oder trocken) 200 g; Salz 1 Prise', 'Dosenware abspülen und abtropfen; Trockenware einweichen und weich kochen (Linsen 10–25 Min.), abkühlen und würzen.');
add(['Olivenöl', 'Sesamöl'], 'Öl 200 ml', 'Fertigprodukt – portionieren bzw. in Spenderflaschen füllen.');
add('Kapern', 'Kapern 200 g', 'Fertigprodukt – abspülen, abtropfen, ggf. grob hacken.');

// ---- Käse ----
add(['Parmesan', 'Parmesanspäne', 'Pecorino', 'Geriebener Käse', 'Senner Alpkäse'], 'Hartkäse 200 g', 'Käse reiben bzw. mit dem Hobel in Späne schneiden, kühl lagern, kurz vor dem Servieren aufstreuen.');
add(['Mozzarella', 'Babymozzarella'], 'Mozzarella 200 g; Olivenöl 5 ml', 'Abtropfen, in Scheiben oder Würfel schneiden (Baby: ganz lassen), ggf. mit Öl und Kräutern marinieren.');
add(['Feta', 'Hirtenkäse', 'Schafskäse', 'Ziegenkäse'], 'Weichkäse 200 g; Olivenöl 5 ml', 'Käse abtropfen, würfeln oder bröseln, ggf. mit Öl und Kräutern marinieren.');
add(['Ricotta'], 'Ricotta 200 g; Salz 1 Prise', 'Ricotta abtropfen, glatt rühren, würzen.');
add(['Frischkäse', 'Gemüsefrischkäse', 'Kräuterfrischkäse', 'Lachsfrischkäse', 'Limetten-Frischkäse', 'Olivenfrischkäse'], 'Frischkäse 160 g; Zutat (Gemüse/Kräuter/Lachs/Limette/Oliven) 40 g; Salz 1 Prise', 'Zutat fein hacken, mit dem Frischkäse glatt rühren, abschmecken, kühl stellen.');
add('Camembert', 'Camembert 200 g', 'Fertigprodukt – temperieren, in Spalten schneiden.');

// ---- Fleisch, Fisch, Ei, Tofu ----
add(['Speck', 'Gerösteter Speck'], 'Speckwürfel 200 g', 'Speck ohne Fett in der Pfanne bei mittlerer Hitze knusprig auslassen, auf Küchenpapier abtropfen.');
add(['Gekochter Schinken', 'Mailänder Salami', 'Kaviar', 'Geräucherter Wildlachs', 'Veganer Aufschnitt'], 'Ware 200 g', 'Fertigprodukt – dünn aufschneiden bzw. portionieren, kühl halten und erst kurz vor dem Servieren anrichten.');
add(['Rührei'], 'Eier 6 Stk; Milch 30 ml; Butter 15 g; Salz 2 g', 'Eier mit Milch und Salz verquirlen, in Butter bei niedriger Hitze unter Rühren cremig stocken lassen.');
add(['Ei', 'Bio-Ei'], 'Eier 4 Stk; Wasser 1 l', 'Eier 8–9 Min. kochen, abschrecken, pellen (Bio-Ei: gleiche Methode).');
add('Spiegelei', 'Eier 3 Stk; Butter 10 g; Salz 1 Prise', 'Eier in Butter bei mittlerer Hitze braten, bis das Eiweiß gestockt ist, salzen.');
add('Flädle', 'Mehl 60 g; Milch 90 ml; Ei 1 Stk; Salz 1 Prise; Butter 5 g', 'Teig glatt rühren, ruhen, dünne Pfannkuchen backen, aufrollen und in Streifen schneiden.');
add('Markklößchen', 'Rindermark 40 g; Semmelbrösel 70 g; Ei 1 Stk; Petersilie 3 g; Salz 1 Prise', 'Mark mit Ei, Bröseln und Petersilie verrühren, ruhen, Klößchen formen, in Salzwasser 8 Min. garziehen.');
add('Gesiedetes Fleisch', 'Rindfleisch 200 g; Suppengemüse 80 g; Salz 3 g; Lorbeerblatt 1 Stk', 'Fleisch in Salzwasser mit Gemüse 1,5–2 Std. leise köcheln, in Scheiben schneiden.');
add('Rinderhackfleisch', 'Rinderhack 200 g; Salz 1 Prise; Pfeffer 1 Prise; Öl 1 EL', 'Hack in heißem Öl krümelig anbraten, würzen.');
add(['Tofu', 'Tempeh'], 'Tofu/Tempeh 200 g; Sojasoße 10 ml; Öl 1 EL', 'Pressen, würfeln, in heißem Öl knusprig braten, mit Sojasoße ablöschen.');

// ---- Obst ----
add(['Ananas', 'Apfel', 'Aprikose', 'Birne', 'Erdbeeren', 'Himbeeren', 'Honigmelone', 'Honigmelonenbällchen', 'Mango', 'Orangenfilets', 'Pfirsich', 'Pfirsiche', 'Trauben', 'Sauerkirschen', 'Granatapfel'],
  'Obst 200 g; Zitronensaft 3 ml', 'Obst waschen, schälen bzw. entsteinen, in Stücke, Spalten oder Bällchen schneiden (Orangenfilets filetieren), mit wenig Zitronensaft beträufeln, kühl stellen.');
add(['Karamellisierte Cranberries', 'Karamellisierte Feigen', 'Karamellisierte Äpfel'], 'Früchte 170 g; Zucker 30 g; Butter 5 g', 'Zucker karamellisieren, Butter und Früchte zugeben, 2–3 Min. schwenken.');
add(['Preiselbeeren'], 'Preiselbeeren (Glas) 200 g', 'Fertigprodukt – portionieren.');
add('Avocado', 'Avocado 200 g; Zitronensaft 5 ml; Salz 1 Prise', 'Avocado halbieren, entsteinen, aus der Schale lösen, in Scheiben oder Würfel schneiden, sofort mit Zitrone beträufeln.');
add('Zimtkirschen', 'Sauerkirschen 160 g; Zucker 25 g; Zimt 1 Prise; Wasser 20 ml', 'Kirschen mit Zucker, Zimt und Wasser 8 Min. köcheln.');
add('Erdbeer-Minz-Salat', 'Erdbeeren 180 g; Minze 2 g; Zucker 10 g; Zitronensaft 3 ml', 'Erdbeeren schneiden, mit Zucker, Zitrone und Minze marinieren, 15 Min. ziehen lassen.');

// ---- Süßes & Gebäck ----
add(['Crumble', 'Hafercrumble', 'Buttercrumbles', 'Vanille-Crumble', 'Vollkorn-Crumbles', 'Applecrumble'], 'Mehl 90 g; Butter 60 g; Zucker 50 g; Haferflocken (bei Hafercrumble) 20 g; Vanille 1 Prise', 'Alles zu Streuseln verkneten, auf Blech streuen, bei 180 °C 15 Min. goldbraun backen, auskühlen.');
add(['Butterkekse', 'Butterkeks', 'Cantuccini'], 'Kekse 200 g', 'Fertigprodukt – bei Bedarf zerbröseln oder ganz anrichten.');
add(['Brownies', 'Mini-Brownie'], 'Zartbitterschokolade 60 g; Butter 50 g; Zucker 50 g; Eier 1 Stk; Mehl 25 g', 'Schokolade mit Butter schmelzen, Zucker und Ei einrühren, Mehl unterheben, bei 170 °C 20 Min. backen, in Würfel schneiden.');
add(['Mini Croissants', 'Mini Plunderstückchen', 'Mini Rosinenschnecken', 'Mini Schokobrötchen', 'Mini-Berliner', 'Mini-Muffins', 'Apfel-Zimtschnecken'], 'Gebäck (Teigling/Fertigware) 200 g', 'Teiglinge nach Packungsangabe backen bzw. Fertigware frisch halten; vor dem Servieren leicht abkühlen.');
add(['Kakao-Nibs', 'Schokoraspen', 'Weiße Schokolade'], 'Schokolade 200 g', 'Schokolade raspeln bzw. hacken, kühl lagern, kurz vor dem Servieren aufstreuen.');

// ---- Dips, Herzhaftes, Snacks ----
add('Butter', 'Butter 200 g', 'Butter temperieren, portionieren (Röllchen/Rosetten) und kühl stellen.');
add('Kräuterbutter', 'Butter 160 g; Kräuter (gemischt) 25 g; Knoblauch 1 Zehe; Zitronensaft 5 ml; Salz 1 Prise', 'Weiche Butter mit fein gehackten Kräutern, Knoblauch und Gewürzen verrühren, in Folie rollen, kühlen.');
add('Schmand', 'Schmand 200 g; Salz 1 Prise', 'Schmand glatt rühren, ggf. würzen, kühl servieren.');
add('Guacamole', 'Avocado 150 g; Tomate 20 g; Zwiebel 10 g; Limettensaft 10 ml; Koriander 2 g; Salz 1 Prise; Chili 1 g', 'Avocado zerdrücken, mit gewürfelten Zutaten, Limette und Gewürzen mischen, sofort servieren.');
add('Avocadocreme', 'Avocado 150 g; Frischkäse 30 g; Zitronensaft 10 ml; Knoblauch 1 Zehe; Salz 1 Prise', 'Alles fein pürieren, abschmecken, mit Folie bündig abdecken.');
add('Zitronen-Dip', 'Joghurt 100 g; Schmand 70 g; Zitronensaft 10 ml; Schnittlauch 3 g; Salz 1 Prise', 'Alles verrühren, abschmecken, kühl stellen.');
add('Tomatenpesto-Dip', 'Frischkäse 100 g; Tomatenpesto 50 g; Joghurt 50 g; Salz 1 Prise', 'Alles glatt rühren, abschmecken.');
add('Frankfurter Grüne Soße (ohne Beilagen)', 'Saure Sahne 80 g; Schmand 40 g; Joghurt 40 g; Kräuter (7 Kräuter) 40 g; Senf 5 g; Salz 1 Prise', 'Kräuter sehr fein hacken, mit Sahne, Schmand, Joghurt und Senf verrühren, kalt stellen.');
add('Kaffee- und Wasser-Gedeck', 'Kaffee/Wasser/Tassen (pro Person) 1 Stk', 'Getränkestation aufbauen: Kaffee frisch brühen, Wasser in Karaffen kühlen, Tassen und Gläser bereitstellen.');
add(['Geflügel-Wiener', 'Wiener Würstchen'], 'Würstchen 200 g; Wasser 1 l', 'Würstchen in heißem Wasser (80 °C) 8–10 Min. erwärmen, nicht kochen, mit Senf servieren.');
add('Currywurst', 'Bratwurst 150 g; Ketchup 40 g; Currypulver 3 g; Brötchen 1 Stk', 'Wurst braten, in Scheiben schneiden, mit Currysoße (Ketchup + Curry) und Brötchen anrichten.');
add(['Blätterteigschnecke', 'Würstchen im Blätterteig'], 'Blätterteig 120 g; Füllung/Würstchen 80 g; Eigelb 0.3 Stk', 'Blätterteig belegen bzw. Würstchen einrollen, mit Eigelb bestreichen, bei 200 °C 15–18 Min. backen.');
add('Käse-Traube-Spieß', 'Käse (gewürfelt) 120 g; Trauben 80 g', 'Käse und Trauben abwechselnd auf Spieße stecken, kühl stellen.');
add(['Laugenbrezel mit Butter', 'Laugenstange mit Frischkäse und Tomate', 'Laugenstange mit Schnittkäse und Gurke'], 'Laugengebäck 100 g; Butter/Frischkäse/Käse 40 g; Tomate/Gurke 40 g; Salz 1 Prise', 'Gebäck aufbacken, auskühlen, aufschneiden, belegen oder mit Butter bestreichen.');
add('Zucchini Picata', 'Zucchini 150 g; Mehl 20 g; Ei 1 Stk; Parmesan 10 g; Salz 1 Prise; Öl 40 ml', 'Zucchinischeiben in Mehl, dann in Ei-Parmesan-Mischung wenden, goldgelb ausbacken.');
add('Mini-Veggie-Burger', 'Veggie-Patty 100 g; Brötchen 1 Stk; Gemüse 50 g; Soße 15 g', 'Patty braten, Mini-Brötchen toasten, mit Gemüse und Soße belegen.');
add('Rindswurst', 'Rindswurst 200 g; Öl 1 EL', 'Bei mittlerer Hitze 8–10 Min. braten oder erwärmen.');
add('Kalte Mini-Pizzen', 'Pizzateig 100 g; Tomatensoße 40 g; Mozzarella 40 g; Belag 20 g', 'Mini-Pizzen belegen, bei 250 °C 6–8 Min. backen, abkühlen lassen und kalt servieren.');
add('Bambusstreifen', 'Bambussprossen (Dose) 200 g', 'Abspülen, abtropfen, in Streifen schneiden, kurz anbraten oder kalt verwenden.');
add('Toppings', 'Toppings (gemischt) 200 g', 'Toppings (z. B. Kerne, Röstzwiebeln, Käse, Croutons, Gemüse) einzeln vorbereiten, in Schalen portionieren, kühl bzw. trocken lagern.');
add('Paprikasoße', 'Paprika (geröstet) 100 g; Tomaten 50 g; Zwiebel 20 g; Knoblauch 1 Zehe; Gemüsefond 60 ml; Paprikapulver 3 g; Olivenöl 5 ml', 'Zwiebel, Knoblauch und Paprika in Öl anbraten, Tomaten und Fond zugeben, 15 Min. köcheln, pürieren, abschmecken.');
add('Tzatziki', 'Joghurt 150 g; Gurke 40 g; Knoblauch 1 Zehe; Olivenöl 5 ml; Salz 1 Prise; Dill 1 g', 'Gurke raspeln und ausdrücken, mit Joghurt, Knoblauch, Öl und Dill verrühren, 1 Std. ziehen lassen.');
add(['Curry-Dip', 'Currydip'], 'Joghurt 100 g; Mayonnaise 70 g; Currypulver 4 g; Mango-Chutney 15 g; Salz 1 Prise', 'Alles glatt rühren, abschmecken, 30 Min. ziehen lassen.');
module.exports = R;
