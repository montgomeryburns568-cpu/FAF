// Standardrezepte Soßen, Dips, Dressings – Bezugsmenge 200 ml (bzw. 200 g) fertige Soße/Zubereitung.
// Mengen angelehnt an gängige Grundrezepte (u. a. Kochbuch-/Rezeptportale) und auf 200 ml heruntergerechnet.
const R = [];
const add = (names, z, s) => R.push({ names: [].concat(names), z, s });

// ---- Rahmsoßen ----
const rahm = (names, extra, schritt, fond = 'Gemüsefond') => add(names,
  `${fond} 100 ml; Sahne 100 ml; Schalotten 15 g; Butter 10 g; Mehl 6 g; ${extra}; Salz 1 Prise; Pfeffer 1 Prise`,
  `Schalotten in Butter glasig anschwitzen${schritt ? ', ' + schritt : ''}, mit Mehl stäuben, mit ${fond} und Sahne aufgießen und 10 Min. einkochen. Abschmecken.`);
rahm('Rahmsoße', 'Zitronensaft 1 TL', '');
rahm(['Champignonrahmsoße', 'Pilzrahmsoße'], 'Champignons 60 g', 'Champignons dazugeben und mitbraten', 'Gemüsefond');
rahm('Steinpilzsauce', 'Steinpilze (getrocknet) 5 g; Weißwein 20 ml', 'eingeweichte Steinpilze mit Weißwein dazugeben');
rahm('Paprikarahmsoße', 'Paprika 50 g; Paprikapulver edelsüß 1 TL; Tomatenmark 1 TL', 'Paprikawürfel und Tomatenmark mitrösten');
rahm('Gorgonzolasoße', 'Gorgonzola 40 g', 'Gorgonzola zum Schluss unterrühren und schmelzen');
rahm('Spinat-Gorgonzolasoße', 'Gorgonzola 40 g; Blattspinat 40 g', 'Spinat kurz mitdünsten, Gorgonzola zum Schluss schmelzen');
rahm('Pfeffersoße', 'Grüne Pfefferkörner 1 EL; Cognac 10 ml', 'Pfefferkörner anrösten, mit Cognac ablöschen', 'Rinderfond');
rahm('Dillsoße', 'Dill 5 g; Zitronensaft 1 TL', 'Dill zum Schluss einrühren');
rahm('Sahne-Apfel-Soße', 'Apfel 50 g; Apfelsaft 30 ml', 'Apfelwürfel mitdünsten');
rahm('Sahnesoße', 'Muskat 1 Prise', '');
rahm('Sherryrahmsoße', 'Sherry (trocken) 30 ml; Champignons 30 g', 'mit Sherry ablöschen');
rahm('Kräutersoße', 'Kräuter (gemischt) 8 g', 'Kräuter zum Schluss einrühren');
rahm('Dijon-Senf-Soße', 'Dijon-Senf 15 g', 'Senf zum Schluss einrühren, nicht mehr kochen');
rahm('Senfsoße', 'Senf mittelscharf 15 g', 'Senf zum Schluss einrühren');
rahm('Senf-Dill-Soße', 'Senf 12 g; Dill 5 g; Zucker 1 Prise', 'Senf und Dill zum Schluss einrühren');
rahm('Knoblauchsoße', 'Knoblauch 1 Zehe', 'Knoblauch mit anschwitzen');
rahm('Trüffel-Cremesoße', 'Trüffelöl 1 TL; Weißwein 20 ml', 'mit Weißwein ablöschen, Trüffelöl zum Schluss');
rahm('Pesto-Rahmsoße', 'Basilikumpesto 20 g', 'Pesto zum Schluss einrühren');
rahm('Basilikumsoße', 'Basilikum 8 g', 'Basilikum zum Schluss pürieren und einrühren');
add('Sauerkraut-Rahm', 'Sauerkraut 80 g; Sahne 80 ml; Zwiebel 15 g; Butter 5 g; Salz 1 Prise', 'Zwiebel in Butter andünsten, Sauerkraut zugeben, mit Sahne 10 Min. köcheln, fein hacken.');
add('Béchamelsoße', 'Milch 180 ml; Butter 12 g; Mehl 12 g; Muskat 1 Prise; Salz 1 Prise', 'Butter schmelzen, Mehl anschwitzen, Milch nach und nach einrühren, 5 Min. köcheln, würzen.');
add('Kräuterquark', 'Quark 150 g; Joghurt 40 g; Kräuter (gemischt) 10 g; Zitronensaft 1 TL; Salz 1 Prise; Pfeffer 1 Prise', 'Alles glatt rühren und 30 Min. ziehen lassen.');
add('Apfelmus', 'Äpfel 250 g; Wasser 30 ml; Zucker 15 g; Zimt 1 Prise', 'Äpfel würfeln, mit Wasser und Zucker weich kochen, passieren oder stampfen.');

add('Zwiebelsoße', 'Zwiebeln 80 g; Rinderfond 100 ml; Rotwein 20 ml; Butter 8 g; Speisestärke 3 g; Zucker 1 TL; Salz 1 Prise; Pfeffer 1 Prise', 'Zwiebeln in Streifen in Butter lange braun anschwitzen, Zucker karamellisieren, mit Wein und Fond ablöschen, 15 Min. einkochen, mit Stärke binden.');
// ---- Jus / Bratensoßen ----
const jus = (names, wein, zusatz, schritt) => add(names,
  `Rinderfond 120 ml; ${wein}; Zwiebel 20 g; Karotte 15 g; Tomatenmark 5 g; Butter 5 g; Speisestärke 3 g; ${zusatz}; Salz 1 Prise; Pfeffer 1 Prise`,
  `Gemüse mit Tomatenmark anrösten, mit Wein ablöschen und einkochen, Fond zugeben und auf ca. 200 ml reduzieren${schritt ? ', ' + schritt : ''}. Abseihen, mit Stärke binden, mit kalter Butter montieren.`);
jus(['Rotweinjus', 'Rotweinsoße'], 'Rotwein 60 ml', 'Thymian 1 Zweig', '');
jus('Bratensoße', 'Rotwein 30 ml', 'Lorbeerblatt 1 Stk', 'mit Bratensatz ansetzen');
jus('Braune Soße', 'Rotwein 30 ml', 'Lorbeerblatt 1 Stk', '');
jus('Portweinjus', 'Portwein 60 ml', 'Thymian 1 Zweig', '');
jus('Thymianjus', 'Rotwein 40 ml', 'Thymian 4 Zweige', '');
jus('Rosmarinjus', 'Rotwein 40 ml', 'Rosmarin 2 Zweige', '');
jus('Kräuterjus', 'Weißwein 40 ml', 'Kräuter (gemischt) 8 g', 'Kräuter zum Schluss zugeben');
jus('Balsamico-Jus', 'Rotwein 30 ml', 'Balsamico 20 ml', '');
jus('Balsamicosoße', 'Rotwein 30 ml', 'Balsamico 20 ml', '');
jus('Gremolata-Jus', 'Weißwein 40 ml', 'Zitronenabrieb 1 TL; Petersilie 5 g; Knoblauch 1 Zehe', 'Gremolata zum Schluss einrühren');
jus('Madeirasoße', 'Madeira 50 ml', 'Champignons 20 g', '');
jus('Marsalasoße', 'Marsala 50 ml', 'Champignons 20 g', '');
jus('Burgundersoße', 'Burgunder (Rotwein) 70 ml', 'Speck 10 g', '');
jus('Dunkelbiersoße', 'Dunkelbier 70 ml', 'Zucker 3 g', '');
jus('Glühwein-Preiselbeer-Jus', 'Glühwein 60 ml', 'Preiselbeeren 15 g', '');
jus('Rosinensoße', 'Rotwein 30 ml', 'Rosinen 20 g; Essig 1 TL; Zucker 1 TL', '');
jus('Zwiebelsoße', 'Rotwein 20 ml', 'Zwiebeln 60 g; Zucker 1 TL', 'Zwiebeln extra lange braun anschwitzen');
jus('Jägersoße', 'Rotwein 30 ml', 'Champignons 50 g; Speck 10 g', '');
add('Rieslingsoße', 'Riesling 70 ml; Fischfond 70 ml; Sahne 60 ml; Schalotte 15 g; Butter 8 g; Salz 1 Prise', 'Schalotte in Butter anschwitzen, mit Riesling ablöschen und einkochen, Fond und Sahne zugeben, 8 Min. reduzieren.');
add('Proseccosoße', 'Prosecco 70 ml; Fischfond 70 ml; Sahne 60 ml; Schalotte 15 g; Butter 8 g; Salz 1 Prise', 'Schalotte in Butter anschwitzen, mit Prosecco ablöschen und einkochen, Fond und Sahne zugeben, 8 Min. reduzieren.');

// ---- Weißwein-/Butter-/Zitrus-Soßen ----
const weiss = (names, extra, schritt) => add(names,
  `Weißwein 60 ml; Gemüsefond 80 ml; Sahne 50 ml; Schalotte 15 g; Butter 10 g; ${extra}; Salz 1 Prise`,
  `Schalotte in Butter anschwitzen, mit Weißwein ablöschen und einkochen, Fond und Sahne zugeben, 8 Min. reduzieren${schritt ? ', ' + schritt : ''}.`);
weiss('Weißweinsoße', 'Zitronensaft 1 TL', '');
weiss('Salbei-Weißweinsoße', 'Salbei 3 Blatt', 'Salbei mitziehen lassen');
weiss('Weißwein-Knoblauch-Soße', 'Knoblauch 2 Zehen', 'Knoblauch mit anschwitzen');
weiss('Zitronen-Kapern-Soße', 'Kapern 10 g; Zitronensaft 15 ml', 'Kapern und Zitronensaft zum Schluss zugeben');
weiss('Zitronensoße', 'Zitronensaft 20 ml; Zitronenabrieb 1 TL', '');
weiss('Kapernsoße', 'Kapern 15 g; Zitronensaft 10 ml', '');
weiss('Safransoße', 'Safran 1 Prise', 'Safran in warmem Fond lösen und zugeben');
weiss('Orangensoße', 'Orangensaft 60 ml; Orangenabrieb 1 TL', 'mit Orangensaft ansetzen');
weiss('Provenzalische Soße', 'Tomaten (gewürfelt) 50 g; Knoblauch 1 Zehe; Thymian 1 Zweig; Oliven 10 g', 'Tomaten, Oliven und Kräuter mitköcheln');
add('Orangen-Mandelsoße', 'Orangensaft 100 ml; Sahne 70 ml; Gemüsefond 30 ml; Mandelblättchen 10 g; Zwiebel 10 g; Speisestärke 4 g; Salz 1 Prise; Pfeffer 1 Prise', 'Mandeln rösten, Zwiebel andünsten, mit Saft und Fond aufkochen, Sahne zugeben, mit Stärke binden, Mandeln unterheben.');
add(['Zitronenbutter', 'Salbeibutter'], 'Butter 40 g; Zitronensaft 10 ml; Salbei 3 Blatt; Salz 1 Prise', 'Butter schmelzen und bräunen, Salbei kurz mitbraten, mit Zitronensaft abschmecken.');
add('Zitronen-Hollandaise', 'Butter 100 g; Eigelb 2 Stk; Zitronensaft 10 ml; Weißwein 20 ml; Salz 1 Prise', 'Eigelb mit Wein und Zitronensaft über dem Wasserbad aufschlagen, flüssige Butter langsam einrühren, würzen.');
add('Zitronenöl', 'Olivenöl 160 ml; Zitronenschale 10 g; Zitronensaft 20 ml; Salz 1 Prise', 'Zitronenschale mit Öl erwärmen, ziehen lassen, mit Saft und Salz mixen.');
add('Knoblauchöl', 'Olivenöl 180 ml; Knoblauch 4 Zehen; Salz 1 Prise', 'Knoblauch fein hacken, im Öl bei 80 °C 10 Min. ziehen lassen.');
add('Chiliöl', 'Rapsöl 180 ml; Chiliflocken 10 g; Knoblauch 1 Zehe; Salz 1 Prise', 'Öl auf 120 °C erhitzen, über Chili und Knoblauch gießen, auskühlen lassen.');

// ---- Tomatensoßen ----
const tomate = (names, extra, schritt) => add(names,
  `Tomaten (stückig, Dose) 170 g; Zwiebel 20 g; Knoblauch 1 Zehe; Olivenöl 1 EL; Zucker 1 Prise; ${extra}; Salz 1 Prise; Pfeffer 1 Prise`,
  `Zwiebel und Knoblauch in Öl anschwitzen${schritt ? ', ' + schritt : ''}, Tomaten zugeben und 15 Min. einkochen, abschmecken.`);
tomate(['Tomatensoße', 'Pomodoro', 'Tomatensugo'], 'Basilikum 3 g', '');
tomate('Arrabbiata', 'Peperoncini 1 Stk; Petersilie 3 g', 'Peperoncini mitrösten');
tomate('Tomaten-Oliven-Soße', 'Oliven 20 g; Kapern 5 g', 'Oliven und Kapern zum Schluss zugeben');
tomate('Tomaten-Champignon-Soße', 'Champignons 50 g', 'Champignons mitbraten');
tomate('Tomaten-Rotwein-Soße', 'Rotwein 40 ml', 'mit Rotwein ablöschen und einkochen');
tomate('Tomaten-Weißweinsoße', 'Weißwein 40 ml', 'mit Weißwein ablöschen und einkochen');
tomate('Tomaten-Thymiansoße', 'Thymian 2 Zweige', '');
tomate('Tomaten-Kräutersoße', 'Kräuter (gemischt) 8 g', '');
add('Tomaten-Sahnesoße', 'Tomaten (stückig, Dose) 120 g; Sahne 60 ml; Zwiebel 15 g; Knoblauch 1 Zehe; Olivenöl 1 EL; Basilikum 3 g; Salz 1 Prise', 'Zwiebel und Knoblauch in Öl anschwitzen, Tomaten 10 Min. einkochen, Sahne zugeben, abschmecken.');
add(['Salsa', 'Salsa Roja'], 'Tomaten 120 g; Zwiebel 25 g; Paprika 25 g; Knoblauch 1 Zehe; Chili 1 g; Limettensaft 1 EL; Koriander 3 g; Salz 1 Prise', 'Alles fein würfeln, mischen, würzen und 20 Min. ziehen lassen (für Salsa Roja kurz anrösten und pürieren).');
add('Tomatenfond', 'Tomaten 180 g; Zwiebel 15 g; Knoblauch 1 Zehe; Thymian 1 Zweig; Olivenöl 1 EL; Salz 1 Prise', 'Tomaten mit Zwiebel und Knoblauch in Öl 20 Min. schmoren, passieren, abschmecken.');
add('Oliven-Tomaten-Pesto', 'Getrocknete Tomaten 40 g; Oliven 30 g; Olivenöl 50 ml; Pinienkerne 15 g; Parmesan 15 g; Knoblauch 1 Zehe', 'Alles im Mixer zu einer groben Paste verarbeiten, würzen.');
add(['Tomatenpesto', 'Tomatenpestodip', 'Tomatenpesto-Marinade'], 'Getrocknete Tomaten 50 g; Olivenöl 60 ml; Pinienkerne 15 g; Parmesan 15 g; Knoblauch 1 Zehe; Salz 1 Prise', 'Alles im Mixer zu einer Paste verarbeiten, abschmecken (für Dip mit Frischkäse/Schmand 1:1 verrühren).');

// ---- Asiatisch & Curry ----
add('Kokos-Currysoße', 'Kokosmilch 120 ml; Gemüsefond 60 ml; Currypaste 10 g; Zwiebel 15 g; Ingwer 3 g; Öl 1 TL; Limettensaft 1 TL; Salz 1 Prise', 'Zwiebel und Ingwer in Öl anschwitzen, Currypaste mitrösten, mit Kokosmilch und Fond aufgießen, 10 Min. köcheln, mit Limette abschmecken.');
add(['Curry-Kokossoße', 'Kokos-Limettensoße', 'Mandel-Kokos-Soße'], 'Kokosmilch 120 ml; Gemüsefond 60 ml; Currypaste (gelb) 8 g; Zwiebel 15 g; Limettensaft 1 EL; Öl 1 TL; Salz 1 Prise', 'Zwiebel in Öl anschwitzen, Currypaste mitrösten, mit Kokosmilch und Fond 10 Min. köcheln, mit Limette abschmecken (Mandel-Kokos: 15 g geröstete Mandeln zugeben).');
add(['Currysoße', 'Currycreme'], 'Sahne 100 ml; Gemüsefond 80 ml; Currypulver 6 g; Zwiebel 15 g; Apfel 15 g; Butter 8 g; Mehl 6 g; Salz 1 Prise', 'Zwiebel und Apfel in Butter anschwitzen, Curry und Mehl mitrösten, mit Fond und Sahne aufgießen, 10 Min. köcheln, pürieren.');
add(['Gelbe Currypaste', 'Rote Currypaste'], 'Currypaste 20 g; Kokosmilch 160 ml; Öl 1 TL; Fischsoße 1 TL; Zucker 1 Prise', 'Currypaste in Öl anrösten, mit Kokosmilch aufgießen, 5 Min. köcheln, würzen.');
add('Erdnusssoße', 'Erdnussbutter 60 g; Kokosmilch 90 ml; Sojasoße 15 ml; Limettensaft 1 EL; Honig 1 TL; Chili 1 g; Knoblauch 1 Zehe', 'Alle Zutaten erwärmen und glatt rühren, ggf. mit Wasser verdünnen.');
add('Erdnussdip', 'Erdnussbutter 60 g; Kokosmilch 80 ml; Sojasoße 15 ml; Limettensaft 1 EL; Honig 1 TL; Chili 1 g', 'Alle Zutaten kalt glatt rühren.');
add(['Sweet-Chili-Soße', 'Sweet-Chili', 'Sweet-Chili-Dip', 'Sweet-Chili-Marinade'], 'Sweet-Chili-Soße 150 g; Limettensaft 1 EL; Sojasoße 1 TL; Koriander 3 g', 'Alles verrühren und abschmecken.');
add('Hoisinsoße', 'Hoisinsoße 100 g; Sojasoße 30 ml; Honig 15 g; Reisessig 15 ml; Knoblauch 1 Zehe; Wasser 30 ml', 'Alle Zutaten kurz aufkochen und glatt rühren.');
add('Austernsoße', 'Austernsoße 80 g; Sojasoße 30 ml; Wasser 60 ml; Zucker 1 TL; Speisestärke 4 g', 'Aufkochen und mit Stärke leicht binden.');
add('Chili-Knoblauch-Soße', 'Chili 10 g; Knoblauch 4 Zehen; Reisessig 40 ml; Zucker 20 g; Wasser 60 ml; Salz 1 Prise', 'Chili und Knoblauch fein hacken, mit Essig, Zucker und Wasser 10 Min. köcheln.');
add('Sojasoße', 'Sojasoße 150 ml; Reisessig 20 ml; Sesamöl 1 TL; Ingwer 3 g; Zucker 1 TL', 'Alle Zutaten verrühren, 10 Min. ziehen lassen.');
add('Miso-Glasur', 'Miso 50 g; Mirin 40 ml; Zucker 15 g; Sojasoße 10 ml; Sesamöl 1 TL', 'Alles bei niedriger Hitze glatt rühren und leicht einkochen; Gemüse damit bestreichen und kurz gratinieren.');

// ---- BBQ ----
add(['BBQ-Soße', 'BBQ-Marinade'], 'Ketchup 100 g; Apfelessig 15 ml; Brauner Zucker 20 g; Worcestershire 5 ml; Paprikapulver geräuchert 3 g; Senf 5 g; Knoblauchpulver 1 g; Wasser 40 ml', 'Alles 10 Min. köcheln und pürieren, abschmecken.');
add('Honig-BBQ-Soße', 'BBQ-Soße 150 g; Honig 25 g; Apfelessig 10 ml', 'BBQ-Soße mit Honig und Essig kurz aufkochen.');
add('Whiskey-BBQ-Soße', 'BBQ-Soße 150 g; Whiskey 30 ml; Brauner Zucker 10 g', 'Whiskey einkochen, mit BBQ-Soße und Zucker 5 Min. köcheln.');
add('Burgersoße', 'Mayonnaise 90 g; Ketchup 40 g; Senf 5 g; Gewürzgurke 20 g; Zwiebel 10 g; Paprikapulver 1 g; Essig 1 TL', 'Gurke und Zwiebel fein hacken, alles verrühren, 30 Min. ziehen lassen.');

// ---- Dips & kalte Soßen ----
add('Joghurtsoße', 'Joghurt 170 g; Zitronensaft 1 TL; Knoblauch 1 Zehe; Salz 1 Prise; Olivenöl 1 TL', 'Alles verrühren und abschmecken.');
add(['Joghurt-Minz-Dip', 'Minz-Joghurt-Dip', 'Minzjoghurt'], 'Joghurt 170 g; Minze 6 g; Zitronensaft 1 TL; Knoblauch 1 Zehe; Salz 1 Prise', 'Minze fein hacken, mit allen Zutaten verrühren, 20 Min. ziehen lassen.');
add('Zitronen-Dill-Dip', 'Joghurt 100 g; Schmand 70 g; Dill 5 g; Zitronensaft 10 ml; Zitronenabrieb 1 TL; Salz 1 Prise', 'Alles verrühren, abschmecken.');
add('Meerrettichsoße', 'Sahne 90 ml; Milch 60 ml; Meerrettich (frisch gerieben) 20 g; Butter 8 g; Mehl 8 g; Salz 1 Prise', 'Mehlschwitze mit Milch und Sahne aufgießen, 5 Min. köcheln, Meerrettich zum Schluss unterrühren.');
add('Sahnemeerrettich', 'Sahne 140 ml; Meerrettich 25 g; Zitronensaft 1 TL; Salz 1 Prise; Zucker 1 Prise', 'Sahne halbsteif schlagen, Meerrettich und Würze unterheben.');
add('Frankfurter Grüne Soße', 'Saure Sahne 80 g; Schmand 40 g; Joghurt 40 g; Kräuter (7 Kräuter) 40 g; Eier (hart gekocht) 1 Stk; Senf 5 g; Essig 1 TL; Salz 1 Prise', 'Kräuter sehr fein hacken, mit Sahne, Schmand, Joghurt und Senf verrühren, Eier hacken und unterheben, kalt stellen.');
add('Remouladensoße', 'Mayonnaise 120 g; Joghurt 40 g; Gewürzgurke 20 g; Kapern 5 g; Kräuter 5 g; Senf 5 g; Ei (hart) 1 Stk', 'Alles fein hacken und verrühren, abschmecken.');
add(['Rucola-Pesto', 'Pesto', 'Pestodip'], 'Rucola 40 g; Olivenöl 70 ml; Pinienkerne 20 g; Parmesan 25 g; Knoblauch 1 Zehe; Salz 1 Prise', 'Alles im Mixer fein pürieren, abschmecken (Pestodip: 1:1 mit Frischkäse oder Schmand mischen; Basilikumpesto: Rucola durch Basilikum ersetzen).');
add('Thunfischsoße', 'Thunfisch (Dose) 70 g; Mayonnaise 70 g; Joghurt 40 g; Kapern 5 g; Zitronensaft 1 TL; Sardelle 1 Stk', 'Alles fein pürieren und abschmecken.');
add('Thunfischcreme', 'Thunfisch (Dose) 90 g; Frischkäse 90 g; Zitronensaft 1 TL; Kapern 5 g; Pfeffer 1 Prise', 'Alles fein pürieren und abschmecken.');
add('Chimichurri', 'Petersilie 25 g; Olivenöl 90 ml; Rotweinessig 20 ml; Knoblauch 2 Zehen; Oregano 1 g; Chili 1 g; Salz 1 Prise', 'Kräuter und Knoblauch fein hacken, mit Öl und Essig verrühren, 30 Min. ziehen lassen.');
add('Salsa verde', 'Petersilie 25 g; Kapern 10 g; Sardelle 1 Stk; Knoblauch 1 Zehe; Olivenöl 100 ml; Zitronensaft 10 ml; Senf 3 g', 'Alles fein hacken oder grob mixen, abschmecken.');
add(['Aioli', 'Safran-Aioli'], 'Eigelb 1 Stk; Olivenöl 140 ml; Knoblauch 2 Zehen; Zitronensaft 1 TL; Salz 1 Prise; Safran 1 Prise', 'Eigelb mit Knoblauch und Salz verrühren, Öl tropfenweise einarbeiten, mit Zitrone abschmecken (Safran-Aioli: Safran in 1 TL warmem Wasser lösen und zugeben).');
add('Hummus', 'Kichererbsen (gekocht) 120 g; Tahini 25 g; Zitronensaft 20 ml; Knoblauch 1 Zehe; Olivenöl 20 ml; Salz 1 Prise; Kreuzkümmel 1 g; Eiswasser 30 ml', 'Alles mit Eiswasser cremig pürieren, abschmecken.');
add(['Tahini-Soße', 'Tahini-Creme'], 'Tahini 50 g; Zitronensaft 25 ml; Wasser 60 ml; Knoblauch 1 Zehe; Salz 1 Prise; Joghurt 40 g', 'Alles glatt rühren, mit Wasser auf Konsistenz bringen.');
add('Balsamicocreme', 'Balsamico 150 ml; Zucker 15 g', 'Balsamico mit Zucker auf ein Drittel einkochen, abkühlen lassen.');
add('Balsamicoreduktion', 'Balsamico 200 ml; Honig 10 g', 'Auf ein Drittel einkochen, bis sie sirupartig ist.');
add('Lachscreme', 'Räucherlachs 70 g; Frischkäse 100 g; Sahne 30 ml; Zitronensaft 1 TL; Dill 2 g; Pfeffer 1 Prise', 'Alles fein pürieren und abschmecken, kalt stellen.');
add('Bohnencreme', 'Weiße Bohnen (gekocht) 140 g; Olivenöl 25 ml; Zitronensaft 10 ml; Knoblauch 1 Zehe; Salz 1 Prise', 'Alles fein pürieren, mit Wasser cremig einstellen.');
add(['Kräuterdip', 'Frühlingsdip'], 'Frischkäse 100 g; Joghurt 70 g; Kräuter (gemischt) 12 g; Frühlingszwiebel 10 g; Zitronensaft 1 TL; Salz 1 Prise', 'Kräuter und Zwiebel fein schneiden, alles verrühren und ziehen lassen.');
add('Limetten-Schmand', 'Schmand 170 g; Limettensaft 15 ml; Limettenabrieb 1 TL; Salz 1 Prise; Zucker 1 Prise', 'Alles glatt rühren.');
add('Dill-Schmand', 'Schmand 170 g; Dill 6 g; Zitronensaft 1 TL; Salz 1 Prise', 'Dill fein hacken, mit Schmand verrühren.');
add('Sauerrahmcreme', 'Saure Sahne 120 g; Schmand 60 g; Schnittlauch 4 g; Salz 1 Prise; Pfeffer 1 Prise', 'Alles verrühren und abschmecken.');
add('Sourcreme', 'Saure Sahne 180 g; Limettensaft 1 TL; Salz 1 Prise', 'Alles glatt rühren.');
add('Mascarponecreme', 'Mascarpone 120 g; Sahne 50 ml; Puderzucker 20 g; Vanille 1 Prise', 'Mascarpone mit Zucker glattrühren, Sahne halbsteif schlagen und unterheben.');
add('Cocktailsoße', 'Mayonnaise 90 g; Ketchup 60 g; Sahne 30 ml; Cognac 1 TL; Zitronensaft 1 TL; Worcestershire 1 Spritzer', 'Alles verrühren und abschmecken.');
add('Senfdip', 'Mayonnaise 90 g; Joghurt 60 g; Senf (mittelscharf) 25 g; Honig 5 g', 'Alles verrühren und abschmecken.');
add('Feigensenf', 'Feigenkonfitüre 100 g; Senf (mittelscharf) 40 g; Apfelessig 1 TL; Pfeffer 1 Prise', 'Alles verrühren und kurz erwärmen, auskühlen lassen.');
add('Senf', 'Senf 200 g', 'Fertigprodukt – portionieren und kalt stellen.');
add('Ketchup', 'Ketchup 200 g', 'Fertigprodukt – portionieren und kalt stellen.');
add('Dip', 'Frischkäse 100 g; Joghurt 80 g; Kräuter 8 g; Zitronensaft 1 TL; Salz 1 Prise', 'Alles verrühren und abschmecken; Variante nach Angebot (Kräuter, Curry, Paprika …).');
add('Dressing', 'Olivenöl 80 ml; Essig 40 ml; Senf 5 g; Honig 5 g; Salz 1 Prise; Pfeffer 1 Prise; Wasser 60 ml', 'Alle Zutaten kräftig verrühren oder im Glas schütteln.');
add('Ajvar', 'Ajvar (Glas) 200 g', 'Fertigprodukt – portionieren; nach Wunsch mit Knoblauch und Olivenöl abschmecken.');

// ---- Mousse / Schaum (herzhaft) ----
add('Steinpilzmousse', 'Steinpilze 60 g; Frischkäse 90 g; Sahne 40 ml; Schalotte 10 g; Butter 5 g; Salz 1 Prise', 'Pilze mit Schalotte in Butter braten, abkühlen, fein pürieren, mit Frischkäse und halbsteif geschlagener Sahne mischen.');
add('Waldpilzmousse', 'Waldpilze 60 g; Frischkäse 90 g; Sahne 40 ml; Schalotte 10 g; Butter 5 g; Salz 1 Prise', 'Pilze mit Schalotte in Butter braten, abkühlen, fein pürieren, mit Frischkäse und halbsteif geschlagener Sahne mischen.');
add(['Süßkartoffel-Lauch-Mousse', 'Süßkartoffelmousse'], 'Süßkartoffeln 120 g; Lauch 30 g; Sahne 40 ml; Butter 5 g; Salz 1 Prise; Muskat 1 Prise', 'Süßkartoffeln weich garen, Lauch in Butter dünsten, alles mit Sahne fein pürieren und abschmecken.');
add('Limettenmousse', 'Frischkäse 100 g; Sahne 70 ml; Limettensaft 15 ml; Limettenabrieb 1 TL; Puderzucker 10 g', 'Frischkäse mit Saft und Zucker glattrühren, geschlagene Sahne unterheben.');
add('Bärlauchschaum', 'Gemüsefond 100 ml; Sahne 80 ml; Bärlauch 15 g; Lecithin 1 g; Salz 1 Prise', 'Fond mit Sahne und Bärlauch erwärmen, pürieren, mit Stabmixer aufschäumen.');
add('Olivencreme', 'Schwarze Oliven 70 g; Frischkäse 100 g; Olivenöl 20 ml; Knoblauch 1 Zehe; Zitronensaft 1 TL', 'Alles fein pürieren, abschmecken.');

// ---- Dressings & Marinaden ----
const vinaigrette = (names, extra) => add(names,
  `Olivenöl 90 ml; Essig 40 ml; Wasser 40 ml; Senf 5 g; Honig 5 g; ${extra}; Salz 1 Prise; Pfeffer 1 Prise`, 'Alles kräftig verrühren oder im Glas schütteln, 10 Min. ziehen lassen.');
vinaigrette(['Kräutervinaigrette', 'Kräuterdressing', 'Kräuter-Marinade'], 'Kräuter (gemischt) 10 g');
vinaigrette(['Limettenvinaigrette', 'Limetten-Minz-Marinade'], 'Limettensaft 20 ml; Minze 3 g');
vinaigrette(['Essig-Öl-Dressing', 'Essig-Öl-Marinade'], 'Zwiebel 10 g');
vinaigrette('Kümmel-Senf-Marinade', 'Senf 10 g; Kümmel 1 g; Zwiebel 10 g');
vinaigrette(['Balsamico-Vinaigrette'], 'Balsamico 20 ml; Schalotte 8 g');
vinaigrette('Senf-Dill-Dressing', 'Senf 10 g; Dill 4 g');
vinaigrette('Basilikumpesto-Marinade', 'Basilikumpesto 25 g');
add('Sauerrahm-Dill-Dressing', 'Saure Sahne 120 g; Joghurt 50 g; Dill 5 g; Essig 1 TL; Zucker 1 Prise; Salz 1 Prise', 'Alles verrühren, 15 Min. ziehen lassen.');
add('Johannisbeer-Balsamicodressing', 'Johannisbeergelee 40 g; Balsamico 40 ml; Olivenöl 90 ml; Senf 5 g; Salz 1 Prise', 'Gelee im Balsamico auflösen, Öl einrühren, abschmecken.');
add('Caesar-Dressing', 'Mayonnaise 80 g; Joghurt 50 g; Parmesan 20 g; Zitronensaft 10 ml; Sardelle 1 Stk; Knoblauch 1 Zehe; Worcestershire 1 Spritzer', 'Alles fein pürieren und abschmecken.');
add('Paprika-Marinade', 'Olivenöl 80 ml; Paprikapulver edelsüß 10 g; Paprikapulver geräuchert 3 g; Knoblauch 2 Zehen; Zitronensaft 15 ml; Salz 1 Prise; Pfeffer 1 Prise', 'Alles verrühren; Fleisch mind. 2 Std. darin marinieren.');
add('Tandoori-Marinade', 'Joghurt 130 g; Tandoori-Masala 12 g; Zitronensaft 15 ml; Knoblauch 2 Zehen; Ingwer 5 g; Salz 1 Prise', 'Alles verrühren; Fleisch mind. 4 Std. (besser über Nacht) darin marinieren.');

// ---- Chutneys, Marmeladen, Kompotte ----
add('Apfelchutney', 'Äpfel 120 g; Zwiebel 20 g; Essig 20 ml; Zucker 25 g; Ingwer 3 g; Rosinen 10 g; Zimt 1 Prise', 'Alles würfeln und 20 Min. dick einkochen.');
add('Mango-Maracuja-Chutney', 'Mango 110 g; Maracuja 40 g; Zwiebel 15 g; Essig 15 ml; Zucker 20 g; Ingwer 3 g; Chili 1 g', 'Mango würfeln, mit allen Zutaten 15 Min. einkochen.');
add('Ananas-Minz-Chutney', 'Ananas 130 g; Zucker 15 g; Limettensaft 10 ml; Minze 3 g; Chili 1 g', 'Ananas würfeln, mit Zucker und Limettensaft 10 Min. einkochen, Minze zum Schluss unterheben.');
add('Orangen-Mango-Chutney', 'Mango 90 g; Orange 70 g; Zucker 20 g; Essig 10 ml; Ingwer 3 g', 'Alles würfeln und 15 Min. einkochen.');
add('Apfel-Rotkohl-Relish', 'Rotkohl 90 g; Apfel 50 g; Rotweinessig 20 ml; Zucker 15 g; Zwiebel 15 g; Nelke 1 Stk', 'Alles fein schneiden und 15 Min. weich dünsten, auskühlen lassen.');
add('Preiselbeergelee', 'Preiselbeeren 150 g; Gelierzucker 60 g', 'Mit Gelierzucker aufkochen, 4 Min. sprudelnd kochen, abfüllen (oder Fertigprodukt portionieren).');
add('Zwetschgenröster', 'Zwetschgen 170 g; Zucker 25 g; Zimt 1 Prise; Rotwein 20 ml', 'Zwetschgen entsteinen, mit Zucker, Zimt und Wein 15 Min. weich schmoren.');
add('Zwiebelmarmelade', 'Rote Zwiebeln 130 g; Zucker 25 g; Rotwein 30 ml; Balsamico 15 ml; Thymian 1 Zweig; Salz 1 Prise', 'Zwiebeln in Streifen langsam anschwitzen, Zucker karamellisieren, mit Wein und Essig ablöschen, 25 Min. einkochen.');
add('Zwiebel-Portweinmarmelade', 'Rote Zwiebeln 130 g; Zucker 25 g; Portwein 40 ml; Balsamico 10 ml; Thymian 1 Zweig; Salz 1 Prise', 'Zwiebeln in Streifen langsam anschwitzen, Zucker karamellisieren, mit Portwein und Essig ablöschen, 25 Min. einkochen.');

// ---- Dessertsoßen & Kompott ----
add('Vanillesoße', 'Milch 150 ml; Sahne 40 ml; Eigelb 1 Stk; Zucker 20 g; Vanille 1 Prise; Speisestärke 3 g', 'Milch mit Sahne und Vanille erhitzen, Eigelb mit Zucker und Stärke verrühren, einrühren und bis zur Bindung erwärmen (nicht kochen), abkühlen.');
add('Vanillecreme', 'Milch 150 ml; Sahne 40 ml; Eigelb 2 Stk; Zucker 25 g; Vanille 1 Prise; Speisestärke 8 g', 'Milch mit Vanille erhitzen, Eigelb mit Zucker und Stärke verrühren, einrühren und aufkochen, Frischhaltefolie aufdrücken, kalt stellen.');
add('Erdbeersoße', 'Erdbeeren 150 g; Zucker 20 g; Zitronensaft 1 TL; Wasser 20 ml', 'Erdbeeren mit Zucker und Wasser 5 Min. köcheln, pürieren, abschmecken.');
add('Schokoladensoße', 'Sahne 100 ml; Zartbitterschokolade 80 g; Butter 5 g', 'Sahne aufkochen, über gehackte Schokolade gießen, glatt rühren, Butter einrühren.');
add(['Fruchtkompott', 'Pflaumenkompott', 'Schattenmorellen', 'Zimtkirschen', 'Portweinpflaumen'], 'Früchte 160 g; Zucker 20 g; Saft/Wasser 30 ml; Zimt 1 Prise; Speisestärke 4 g', 'Früchte mit Zucker und Saft 8 Min. köcheln, mit Stärke leicht binden, abkühlen (Portweinpflaumen: Saft durch Portwein ersetzen).');
add('Fruchtpüree', 'Früchte (TK/frisch) 180 g; Zucker 15 g; Zitronensaft 1 TL', 'Früchte mit Zucker kurz erwärmen, fein pürieren, passieren.');
add('Ananasragout', 'Ananas 150 g; Zucker 15 g; Ananassaft 30 ml; Vanille 1 Prise; Speisestärke 4 g', 'Ananas würfeln, mit Saft und Zucker 5 Min. köcheln, mit Stärke binden.');
add('Rote Grütze', 'Rote Früchte (gemischt) 130 g; Fruchtsaft 60 ml; Zucker 20 g; Speisestärke 8 g', 'Saft mit Zucker aufkochen, Stärke einrühren, Früchte zugeben und kurz aufkochen, kalt stellen.');
module.exports = R;
