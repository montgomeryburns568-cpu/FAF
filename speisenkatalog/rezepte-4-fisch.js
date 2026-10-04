// Standardrezepte Fisch & Meeresfrüchte – Bezugsmenge 200 g Rohware (Hauptkomponente).
const R = [];
const add = (names, z, s) => R.push({ names: [].concat(names), z, s });

add(['Gebratenes Zanderfilet', 'Zanderfilet', 'Kabeljaufilet', 'Kabeljau', 'Seelachsfilet', 'Seehecht', 'Pangasiusfilet', 'Pangasius', 'Tilapiafilet', 'Doradenfilet', 'Wolfsbarsch', 'Saint Pierre Filet', 'Seeteufel'],
  'Fischfilet 200 g; Zitronensaft 1 TL; Mehl 5 g; Butter 10 g; Öl 1 EL; Salz 1 Prise; Pfeffer 1 Prise',
  'Filet trocken tupfen, salzen, zitronieren, dünn mehlieren, auf der Hautseite 3–4 Min. bei mittlerer Hitze braten, wenden, 2 Min. in Butter nachgaren (oder bei 160 °C 8 Min. im Ofen).');
add(['Lachsfilet', 'Gebratener Lachs', 'Wildlachsfilet'], 'Lachsfilet 200 g; Öl 1 EL; Zitronensaft 1 TL; Salz 1 Prise; Pfeffer 1 Prise',
  'Filet würzen, auf der Hautseite 4 Min. knusprig braten, wenden, 2 Min. ziehen lassen oder bei 140 °C 10 Min. glasig garen.');
add(['Backfisch'], 'Fischfilet 200 g; Mehl 20 g; Ei 1 Stk; Paniermehl 40 g; Zitronensaft 1 TL; Salz 1 Prise; Öl 40 ml', 'Filet salzen, zitronieren, panieren (Mehl – Ei – Brösel), bei 170 °C goldbraun ausbacken.');
add('Forelle Müllerin', 'Forelle 200 g; Mehl 15 g; Butter 20 g; Zitronensaft 10 ml; Petersilie 3 g; Salz 1 Prise', 'Forelle würzen, mehlieren, in Butter 5 Min. pro Seite braten, mit Zitronen-Butter und Petersilie servieren.');
add('Matjesfilet', 'Matjesfilet 200 g; Zwiebel 30 g; Apfel 30 g; Saure Sahne 50 g; Dill 2 g', 'Matjes wässern, in Stücke schneiden, mit Zwiebel, Apfel und Sahnesoße anrichten.');
add(['Fischfrikadelle'], 'Fischfilet (gehackt) 200 g; Ei 0.5 Stk; Brötchen (eingeweicht) 30 g; Zwiebel 20 g; Dill 2 g; Salz 1 Prise; Öl 1 EL', 'Fisch mit Ei, Brötchen, Zwiebel und Gewürzen vermengen, formen, goldbraun braten.');
add('Fischstäbchen', 'Fischstäbchen (TK) 200 g; Öl 10 ml', 'Bei 200 °C 12–15 Min. backen, einmal wenden.');
add('Thunfischsteak', 'Thunfischsteak 200 g; Sesam 15 g; Öl 1 EL; Sojasoße 5 ml; Salz 1 Prise', 'Steak würzen, in Sesam wenden, auf jeder Seite 1–2 Min. scharf anbraten (innen rosa).');
add(['Thunfisch', 'Mediterraner Thunfischsalat'], 'Thunfisch (Dose) 200 g; Zwiebel 15 g; Zitronensaft 5 ml; Olivenöl 10 ml', 'Thunfisch abtropfen, mit Zwiebel, Zitrone und Öl vermengen, abschmecken.');
add('Lachs-Spieße', 'Lachsfilet (gewürfelt) 200 g; Olivenöl 1 EL; Zitronensaft 1 TL; Dill 2 g; Salz 1 Prise', 'Lachs würfeln, marinieren, aufspießen, 2–3 Min. pro Seite grillen.');
add('Lachs Teriyaki', 'Lachsfilet 200 g; Sojasoße 25 ml; Mirin 20 ml; Honig 10 g; Ingwer 3 g; Sesam 3 g', 'Lachs anbraten, mit Teriyaki-Glasur (Soja, Mirin, Honig, Ingwer) ablöschen und glasieren, mit Sesam bestreuen.');
add('Thunfisch Poké Bowl', 'Thunfisch (Sushi-Qualität) 200 g; Sojasoße 15 ml; Sesamöl 1 TL; Limettensaft 1 TL; Frühlingszwiebel 10 g; Sesam 3 g', 'Thunfisch würfeln, mit Soja, Sesamöl, Limette marinieren, kalt auf der Bowl anrichten.');
add(['Fisch Thai Curry', 'Fisch Curry', 'Garnelen Thai Curry'], 'Fischfilet/Garnelen 200 g; Currypaste 15 g; Kokosmilch 100 ml; Paprika 30 g; Limettensaft 5 ml; Öl 1 EL', 'Currypaste anrösten, mit Kokosmilch aufgießen, Gemüse 5 Min. köcheln, Fisch zugeben und 4–5 Min. garziehen.');
add(['Räucherlachs', 'Räucherfischplatte', 'Räucherlachsmousse', 'Räucherlachsbömbchen', 'Lachsbömbchen'], 'Räucherlachs 200 g; Zitrone 10 g; Dill 2 g', 'Fertigprodukt – kalt aufschneiden und anrichten; für Mousse/Bömbchen mit Frischkäse pürieren und formen.');
add('Gebeizter Lachs', 'Lachs (frisch) 200 g; Salz 10 g; Zucker 8 g; Dill 8 g; Pfeffer 1 g; Senf 5 g', 'Lachs mit Salz-Zucker-Dill-Mischung einreiben, 24–36 Std. gewendet kühl beizen, abspülen, hauchdünn schneiden.');
add('Asiatischer Räucherlachs-Tatar', 'Räucherlachs (gewürfelt) 200 g; Sojasoße 5 ml; Limettensaft 5 ml; Frühlingszwiebel 10 g; Ingwer 2 g; Sesamöl 2 ml', 'Lachs fein würfeln, mit Soja, Limette, Ingwer und Sesamöl marinieren, kalt anrichten.');
add(['Forellen-Dill-Mousse', 'Forellensalat'], 'Räucherforelle 100 g; Frischkäse 90 g; Sahne 30 ml; Dill 3 g; Meerrettich 5 g; Zitronensaft 1 TL', 'Forelle entgräten, mit Frischkäse und Würze pürieren, Sahne unterheben, kalt stellen.');
add('Lachs-Spinat-Lasagne', 'Lachsfilet 80 g; Blattspinat 60 g; Lasagneplatten 30 g; Béchamel 80 ml; Käse 20 g', 'Platten, Lachs, Spinat und Béchamel schichten, mit Käse bestreuen, bei 180 °C 35 Min. backen.');
// ---- Meeresfrüchte ----
add(['Garnelen', 'Gebratene Garnelen', 'Gebratene Garnele', 'Garnele', 'Garnelenspieße', 'Garnelenspieß', 'Tiefseegarnelen', 'Gambas', 'Scampi', 'Garnele im Kartoffelnest', 'Garnele im Kräutermantel', 'Tandoori-Garnele'],
  'Garnelen (geschält) 200 g; Knoblauch 1 Zehe; Olivenöl 1 EL; Chili 1 g; Zitronensaft 1 TL; Salz 1 Prise; Petersilie 3 g', 'Garnelen würzen, in heißem Öl 1–2 Min. pro Seite braten, Knoblauch kurz mitbraten, mit Zitrone und Petersilie abschmecken (nicht übergaren).');
add('Knusprige Panko-Garnele', 'Garnelen (geschält) 200 g; Mehl 15 g; Ei 1 Stk; Panko 40 g; Salz 1 Prise; Öl 40 ml', 'Garnelen würzen, panieren (Mehl – Ei – Panko), bei 175 °C 2–3 Min. goldbraun frittieren.');
add('Kokosgarnelen', 'Garnelen (geschält) 200 g; Mehl 15 g; Ei 1 Stk; Kokosraspeln 30 g; Salz 1 Prise; Öl 40 ml', 'Garnelen würzen, in Mehl, Ei und Kokos wenden, 2–3 Min. goldbraun frittieren.');
add(['Asiatische Shrimpsküchlein', 'Shrimpküchlein'], 'Garnelen (gehackt) 200 g; Ei 0.5 Stk; Frühlingszwiebel 10 g; Ingwer 3 g; Paniermehl 20 g; Koriander 2 g; Salz 1 Prise; Öl 30 ml', 'Garnelen mit Zutaten vermengen, Küchlein formen, goldbraun braten.');
add(['New England-Crabcakes'], 'Krabbenfleisch 200 g; Ei 0.5 Stk; Paniermehl 25 g; Mayonnaise 20 g; Senf 3 g; Petersilie 3 g; Salz 1 Prise; Öl 30 ml', 'Alles locker vermengen, Küchlein formen, 30 Min. kühlen, goldbraun braten.');
add(['Muscheln'], 'Miesmuscheln 200 g; Zwiebel 20 g; Knoblauch 1 Zehe; Weißwein 40 ml; Petersilie 3 g; Butter 8 g', 'Muscheln waschen, Zwiebel und Knoblauch in Butter anschwitzen, mit Wein aufgießen, zugedeckt 5 Min. dämpfen, geschlossene aussortieren.');
add('Spaghetti alle Vongole', 'Venusmuscheln 200 g; Spaghetti 80 g; Knoblauch 1 Zehe; Weißwein 40 ml; Petersilie 3 g; Chili 1 g; Olivenöl 1 EL', 'Spaghetti al dente kochen, Muscheln mit Knoblauch und Wein dämpfen, mit Nudeln und Petersilie schwenken.');
add('Calamari', 'Calamari (Ringe) 200 g; Mehl 20 g; Salz 1 Prise; Öl 40 ml; Zitrone 10 g', 'Ringe trocken tupfen, in Mehl wenden, 90 Sek. bei 180 °C frittieren, salzen, mit Zitrone servieren.');
add('Meeresfrüchte-Paella', 'Meeresfrüchte (gemischt) 100 g; Paellareis 70 g; Brühe 200 ml; Paprika 20 g; Erbsen 15 g; Safran 1 Prise; Zwiebel 15 g; Olivenöl 1 EL', 'Zwiebel und Paprika anbraten, Reis glasig rösten, mit Safranbrühe aufgießen, 15 Min. garen, Meeresfrüchte zuletzt auflegen.');
add(['Andalusischer Meeresfrüchtesalat', 'Sizilianischer Meeresfrüchtesalat', 'Asiatischer Muschel-Shrimpsalat', 'Shrimps-Cocktail', 'Crevettensalat'], 'Meeresfrüchte (gegart) 200 g; Olivenöl 10 ml; Zitronensaft 10 ml; Petersilie 3 g; Salz 1 Prise', 'Meeresfrüchte kurz blanchieren, abkühlen, mit Dressing und Kräutern marinieren, kalt stellen (Cocktail: mit Cocktailsoße).');
add(['Gebratene Jakobsmuschel'], 'Jakobsmuscheln 200 g; Butter 10 g; Salz 1 Prise; Öl 1 EL', 'Muscheln trocken tupfen, würzen, 1,5 Min. pro Seite in heißem Öl braten, mit Butter arrosieren.');
add(['Tiefseekrabben'], 'Tiefseekrabben 200 g; Limettensaft 5 ml; Minze 2 g', 'Krabben abtropfen, mit Limette und Minze marinieren, kalt anrichten.');

module.exports = R;
