// Baut aus dishes.txt die Speisendatenbank:  speisendatenbank.json  +  speisenkatalog.html
// Aufruf:  node build.js
const fs = require('fs');
const path = require('path');
const DIR = __dirname;

const norm = s => (s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').trim();
const has = (n, re) => re.test(n);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- 1. Rohdaten lesen ----------
const ROLE_LABEL = { H: 'Hauptkomponente', S: 'Soße', B: 'Beilage', G: 'Gemüse', E: 'Extra' };
const dishes = [];
const comps = new Map(); // key -> Komponente

// ---------- Stabile IDs: gespeicherte Änderungen im Browser hängen an diesen IDs ----------
// ids.json merkt sich je Komponente (Art|Name) und je Gericht (Text|Gang) die vergebene ID.
// Beim ersten Lauf wird sie aus einer vorhandenen speisendatenbank.json übernommen.
const IDS_FILE = path.join(DIR, 'ids.json');
const REG = { comps: {}, dishes: {} };
if (fs.existsSync(IDS_FILE)) Object.assign(REG, JSON.parse(fs.readFileSync(IDS_FILE, 'utf8')));
else if (fs.existsSync(path.join(DIR, 'speisendatenbank.json'))) {
  const old = JSON.parse(fs.readFileSync(path.join(DIR, 'speisendatenbank.json'), 'utf8'));
  old.komponenten.forEach(c => { REG.comps[c.rolle + '|' + norm(c.name)] = c.id; });
  const cnt = {};
  old.gerichte.forEach(g => { const k0 = g.name + '|' + (g.gangBuero || g.gang); cnt[k0] = (cnt[k0] || 0) + 1; REG.dishes[k0 + '|' + cnt[k0]] = g.id; });
}
const maxId = (obj, p) => Object.values(obj).reduce((m, v) => Math.max(m, +String(v).slice(p.length) || 0), 0);
let nextC = maxId(REG.comps, 'k'), nextD = maxId(REG.dishes, 'g');
const dishCount = {};
const compIdFor = key => REG.comps[key] || (REG.comps[key] = 'k' + (++nextC));
const dishIdFor = (name, gangName) => { const k0 = name + '|' + gangName; dishCount[k0] = (dishCount[k0] || 0) + 1; const k = k0 + '|' + dishCount[k0]; return REG.dishes[k] || (REG.dishes[k] = 'g' + (++nextD)); };
let kueche = 'Klassisch';
let gang = 'Hauptgang', infer = false, nur = false;
let lineNo = 0;
// Küche für Katalog-Gerichte (ohne eigene Küchen-Überschrift) aus dem Namen ableiten
function inferKueche(text) {
  const n = norm(text);
  if (/mexik|taco|burrito|chili con carne|chili sin carne|guacamole|salsa(?! roja)/.test(n)) return 'Mexikanisch';
  if (/indisch|tandoori|tikka|masala|biryani|\bdal\b|korma|kokos-curry|linsen-kokos|gemuse-curry|kartoffelcurry|currysuppe/.test(n)) return 'Indisch';
  if (/asia|thai|vietnam|chinesisch|china|teriyaki|miso|wok|bao |gyoza|glasnudel|bami|yuzu|edamame|sweet-chili|summer roll|mie|crispy rice|tofu|tempeh|soja/.test(n)) return 'Asiatisch';
  if (/orient|arabisch|couscous|falafel|hummus|tajine|shakshuka|dukkah|tabuleh|kebab|tahini|cevapcici|ajvar/.test(n)) return 'Orientalisch';
  if (/ital|pasta|tortelloni|ravioli|gnocchi|lasagne|cannelloni|risotto|tiramisu|panna cotta|parmesan|pesto|caprese|vitello|focaccia|linguine|penne|tagliatelle|minestrone|ribollita|saltimbocca|ciabatta|antipasti|parmaschinken|mozzarella|orzo|polenta|roastbeefrollchen/.test(n)) return 'Italienisch';
  if (/franz|coq au vin|quiche|brulee|crepe|mousse au chocolat|zwiebelsuppe|camembert|saint pierre|tartine/.test(n)) return 'Französisch';
  if (/mediterran|griech|spanisch|andalus|sizilian|provenz|ratatouille|oliven|feta|hirtenkase|chorizo|gazpacho|antipasti|zucchini|aioli|meeresfrucht/.test(n)) return 'Mediterran';
  if (/american|cheesecake|brownie|bbq|burger|wings|crabcake|new england|muffin|cookie|florida|pulled|caesar/.test(n)) return 'Amerikanisch';
  if (/frankfurter|bayrisch|handkas|spundekas|schnitzel|bratwurst|tafelspitz|gulasch|rotkohl|kartoffelsuppe|grune sosse|grune sauce|schneegestober|rinderbraten|sauerbraten|spatzle|knodel|blechkuchen|grutze|griesflammerie|hafermilchreis|schweinenacken|sachsenhauser|kasespatzle|leberkase|aufschnitt|wurstplatte|brotchen|rindswurst|currywurst|gansebrust|gans/.test(n)) return 'Deutsch';
  return 'Klassisch';
}
const srcFiles = ['dishes.txt', ...fs.readdirSync(DIR).filter(f => /^buero-.*\.txt$/.test(f)).sort()];
for (const file of srcFiles) {
  if (file !== 'dishes.txt') { gang = 'Hauptgang'; infer = false; nur = false; }
  lineNo = 0;
for (const raw of fs.readFileSync(path.join(DIR, file), 'utf8').split(/\r?\n/)) {
  lineNo++;
  const line = raw.trim();
  if (!line || line.startsWith('# ')) continue;
  if (line.startsWith('@gang ')) { gang = line.slice(6).trim(); continue; }
  if (line === '@infer') { infer = true; continue; }
  if (line === '@nur') { nur = true; continue; }
  if (line.startsWith('##')) { kueche = line.replace(/^##\s*/, '').trim(); continue; }
  const parts = [];
  const text = line.replace(/\[\[([HSBGE]):([^\]|]+)(?:\|([^\]]+))?\]\]/g, (m, role, shown, canon) => {
    const name = cap((canon || shown).trim());
    const key = role + '|' + norm(name);
    if (!comps.has(key)) comps.set(key, { id: compIdFor(key), name, role, kuechen: new Set(), dishIds: [] });
    const c = comps.get(key);
    parts.push({ role, text: shown.trim(), comp: c.id });
    return shown;
  });
  if (!parts.length) { console.log(file, 'Zeile', lineNo, 'ohne Markierung:', line); continue; }
  if (nur) { parts.forEach(p => { const c = [...comps.values()].find(x => x.id === p.comp); c.nurKomponente = true; }); continue; }
  const dk = infer ? inferKueche(text) : kueche;
  const dname = text.replace(/\s+/g, ' ').trim();
  const d = { id: dishIdFor(dname, gang), name: dname, kueche: dk, gang, quelle: file === 'dishes.txt' ? 'Eigene Auswahl' : 'Büro-Katalog', parts };
  dishes.push(d);
  parts.forEach(p => { const c = [...comps.values()].find(x => x.id === p.comp); c.kuechen.add(dk); c.dishIds.push(d.id); });
}
}
const compById = new Map([...comps.values()].map(c => [c.id, c]));

// ---------- 2. Sammlungen (Gruppen) ----------
const SAVORY_NOT_DESSERT = /reibekuchen|mozzarella|forelle|lachs|pilz|frischkase|kase\b|thunfisch|ziegenkase|schafskase/;
function proteinGroup(n) {
  if (has(n, /suppe|eintopf|bruhe|gazpacho|minestrone|ribollita|bauerntopf|schneegestober|susppchen|suppchen|borschtsch/)) return 'Suppen & Eintöpfe';
  if (has(n, /hahnchen|huhn|chicken|poularde|wings|backhendl|coq au vin|kiewer/)) return 'Hähnchen';
  if (has(n, /\bpute|puten/)) return 'Pute';
  if (has(n, /\bente|entenbrust|entenkeule|barbarie|\bgans|ganse/)) return 'Ente & Gans';
  if (has(n, /kalb|wiener schnitzel|vitello/)) return 'Kalb';
  if (has(n, /(?<!f)lamm/)) return 'Lamm';
  if (has(n, /garnele|scampi|gambas|shrimp|muschel|calamari|tintenfisch|meeresfruchte|vongole|paella|crevette|krabbe|crabcake/) && !has(n, /gemuse/)) return 'Meeresfrüchte';
  if (has(n, /lachs|zander|kabeljau|seelachs|forelle|dorade|wolfsbarsch|thunfisch|seeteufel|matjes|pangasius|tilapia|backfisch|fisch|poke|saint pierre|seehecht|kaviar|hering/) && !has(n, /schweinelachs/)) return 'Fisch';
  if (has(n, /creme|mousse|tiramisu|panna cotta|pudding|grutze|flammerie|crumble|cheesecake|brownie|muffin|kuchen|kuchlein|brulee|obstsalat|fruchtsalat|porridge|tarte|milchreis|hafermilchreis|\bpie\b|pfirsiche|cookie|catalana|medovik|syrniki|cannoli|windbeutel|spritzkuchen|oats|acai|obstspiess|milchreis/) && !has(n, SAVORY_NOT_DESSERT)) return 'Desserts';
  if (has(n, /tortelloni|ravioli|lasagne|cannelloni|gnocchi|linguine|penne|tagliatelle|spaghetti|pasta|nudeln|nudel\b|orzo|zoodles|pelmeni|wareniki|piroggen/)) return 'Pasta & Aufläufe';
  if (has(n, /quiche|pastete|wrap|crepe|brotchen|focaccia|sandwich|bagel|toast|blatterteig|strudel|borek|tartine|bao buns|taco|pizza|frittata|kanapee|canape|baguette|schnecke|zwiebelkuchen|empanada|blini|laugenkonfekt|schlafrock/) && !has(n, /beef|rind|schwein|speck|hack/)) return 'Backwaren, Quiches & Wraps';
  if (has(n, /vegan|veggie|gemuse|tofu|linsen|kichererbsen|falafel|halloumi|paneer|ricotta|kasespatzle|kaiserschmarrn|reibekuchen|bohnen-chili|sin carne/)) return 'Vegetarisch & Vegan';
  if (has(n, /^frikadellen|klopse|leberkase|bratwurst/)) return 'Schwein';
  if (has(n, /rind|roastbeef|tafelspitz|rumpsteak|ossobuco|bistecca|carpaccio|beef|brisket|kofta|chili con carne|klopse|frikadell|hackfleisch|hackball|hackbraten|hacksteak|hackpatty|burger|stroganoff|rouladen|sauerbraten|gulasch|cevapcici|ragout|polpette|kohlroulade|wellington/) && !has(n, /vegan|veggie|gemuse-|linsen|tofu/) && !has(n, /schwein/)) return 'Rind';
  if (has(n, /schwein|nacken|schnitzel|haxe|schaufele|kassler|bratwurst|rippchen|ribs|leberkase|porchetta|pulled pork|saltimbocca|schweinelachs|rahmschnitzel|medaillons|chorizo/)) return 'Schwein';
  if (has(n, /schinken|salami|aufschnitt|wurstplatte|kase|kas\b|speck|wurst|camembert|mortadella|prosciutto|cicchetti/)) return 'Aufschnitt & Käse';
  return 'Vegetarisch & Vegan';
}
function beilageGroup(n) {
  if (has(n, /brot|baguette|ciabatta|bagel|toast|pumpernickel|brotchen|laugenstange|taler/)) return 'Brot & Gebäck';
  return has(n, /kartoffel|pommes|rosti|puree|gratin|stampf|wedges|knodel|klosse|kroketten|drillinge|pellkartoffel/) ? 'Kartoffeln & Knödel' : 'Reis, Nudeln & Getreide';
}
function sosseGroup(n) {
  if (has(n, /vanille|schoko|erdbeer|fruchtpuree|kompott|karamell|himbeer|schattenmorellen|zimtkirsche|ananasragout|rote grutze|portweinpflaume/)) return 'Dessertsoßen & Kompott';
  if (has(n, /dressing|vinaigrette|marinade|essig|reduktion/) && !has(n, /bbq/)) return 'Dressings & Marinaden';
  if (has(n, /chutney|relish|marmelade|gelee|feigensenf|ketchup|ajvar|senf$|^senf/)) return 'Chutneys, Marmeladen & Tischsoßen';
  if (has(n, /bbq|burger|whiskey/)) return 'BBQ & Burger';
  if (has(n, /curry|kokos|erdnuss|teriyaki|hoisin|soja|sweet-chili|sweet chili|austern|korma|satay|chili-knoblauch/)) return 'Asiatisch & Curry';
  if (has(n, /tomat|pomodoro|arrabbiata|salsa(?! verde)/)) return 'Tomatensoßen';
  if (has(n, /tzatziki|joghurt|minz|hummus|knoblauchsosse|aioli|remoulade|tahini|dip|creme(?!sosse)|schmand|mousse|schaum|sauerrahm|zaziki|tonnato|cocktail|chimichurri|pesto|guacamole|salsa verde|basilikum|frankfurter|grune|meerrettich|kraeterquark|kräuterquark|thunfischsosse|rucola/)) return 'Dips & kalte Soßen';
  if (has(n, /jus|bratensosse|rotwein|portwein|madeira|marsala|burgunder|zwiebelsosse|jager|dunkelbier|rosinen|gremolata|balsamico/)) return 'Jus & Bratensoßen';
  if (has(n, /(?<!sch)wein|zitron|butter|safran|kapern|orange|salbei/)) return 'Butter- & Weißweinsoßen';
  if (has(n, /rahm|sahne|champignon|pilz|gorgonzola|senf|dill|kraut|bechamel|pfeffer|steinpilz|paprikarahm|knoblauch|apfel/)) return 'Rahm- & Cremesoßen';
  return 'Sonstige Soßen';
}
function gemueseGroup(n) {
  if (has(n, /salat/)) return 'Salate';
  if (has(n, /kohl|brokkoli|rosenkohl|wirsing|pak choi|sauerkraut|blaukraut|chinakohl/)) return 'Kohlgemüse';
  if (has(n, /karotte|mohre|wurzel|rote bete|pastinake|sellerie|fenchel|gurken-dill|kurbis/)) return 'Wurzelgemüse & Kürbis';
  if (has(n, /erbsen|bohnen|spinat|spargel|mangold|edamame|kichererbsen|linsen/)) return 'Grünes & Hülsenfrüchte';
  return 'Ofen-, Pfannen- & Mittelmeergemüse';
}
function extraGroup(n) {
  if (has(n, /zimtschnecke|brownie|croissant|plunder|rosinenschnecke|schokobrotchen|berliner|muffin|crumble|kekse|keks|cantuccini|schokolade/)) return 'Süßes & Gebäck';
  if (has(n, /wiener|wurst|currywurst|blatterteig|picata|pizza|brezel|laugenstange|spiess|burger|schnecke|rindswurst|aufschnitt/)) return 'Herzhaftes & Snacks';
  if (has(n, /dip|hummus|avocadocreme|minzjoghurt|gedeck|sosse|butter|schmand|guacamole/)) return 'Dips & Gläser';
  if (has(n, /nuss|nusse|mandel|kern|sesam|saat|pinien|pistazie|cashew|erdnuss|kokos|sultanin|rosinen|croutons/)) return 'Nüsse, Kerne & Croutons';
  if (has(n, /kase|mozzarella|parmesan|feta|ricotta|pecorino|camembert|frischkase|alpkase/)) return 'Käse';
  if (has(n, /speck|schinken|salami|fleisch|lachs|kaviar|\bei\b|eier|rührei|ruhrei|tempeh|tofu|flädle|fladle|markklosschen|markkl/)) return 'Fleisch, Fisch, Ei & Tofu';
  if (has(n, /obst|beere|apfel|aepfel|birne|feige|pfirsich|mango|ananas|orange|cranberr|trauben|melone|granatapfel|kirsche|aprikose|datteln|avocado|apfeln/)) return 'Obst & Früchte';
  if (has(n, /kraut|krauter|basilikum|koriander|minze|dill|petersilie|schnittlauch|thymian|salbei|rosmarin|kerbel|kresse|sprossen|ingwer|wasabi|chili|safran|majoran|estragon|knoblauch|zitron|limette|yuzu|dukkah|kummel|salz|pfeffer|peperoncini|kapern/)) return 'Kräuter, Gewürze & Zitrus';
  if (has(n, /oliven|tomate|cornichon|artischocke|paprika|gurke|zwiebel|radieschen|mais|karotte|rettich|lauch|rote|schmor|gemuse|bohnen|erbsen/)) return 'Gemüse-Toppings & Eingelegtes';
  return 'Toppings & Beigaben';
}

for (const c of comps.values()) {
  const n = norm(c.name);
  if (c.role === 'H') { c.sammlung = 'Hauptkomponente'; c.gruppe = proteinGroup(n); }
  else if (c.role === 'S') { c.sammlung = 'Soßen'; c.gruppe = sosseGroup(n); }
  else if (c.role === 'B') { c.sammlung = 'Beilagen'; c.gruppe = beilageGroup(n); }
  else if (c.role === 'G') { c.sammlung = 'Gemüse'; c.gruppe = gemueseGroup(n); }
  else { c.sammlung = 'Extras'; c.gruppe = extraGroup(n); }
}

// ---------- 3. Tag-Ableitung (nur aus dem Namen, daher als "auto" markiert) ----------
const MEAT = /hahnchen|huhn|chicken|pute|\bente|gans|rind|kalb|(?<!f)lamm|schwein|speck|schinken|kassler|rippchen|haxe|schaufele|leberkase|hackfleisch|hackbraten|wings|nuggets|poularde|backhendl|roastbeef|ossobuco|saltimbocca|kofta|kebab|souvlaki|gyros|klopse|pulled|ribs|brisket|bacon|porchetta|cordon bleu|coq au vin|rouladen|sauerbraten|bistecca|vitello|tafelspitz|chili con carne|beef|stroganoff|chorizo|cevapcici|salami|hackball|frikadell|geflugel|rindfleisch|entenbrust|gansebrust|lammrucken|serrano/;
const SOFT_MEAT = /schnitzel|wurst|frikadell|burger|steak|gulasch|ragout|aufschnitt|datteln im speck/;
const VEGGIE_MARK = /sellerie|aubergine|blumenkohl|polenta|kohl|kurbis|vegan|veggie|gemuse|tofu|sin carne|linsen|kichererbsen|falafel|halloumi|paneer|ricotta|kasespatzle|kaiserschmarrn|reibekuchen|bohnen-chili/;
const FISH = /fisch|lachs|zander|kabeljau|forelle|dorade|wolfsbarsch|thunfisch|seeteufel|matjes|pangasius|tilapia|garnele|scampi|gambas|shrimp|muschel|calamari|tintenfisch|meeresfruchte|vongole|paella|sardelle|poke|saint pierre|seehecht|crevette|krabbe|crabcake|kaviar/;
const STOCK = /jus\b|bratensosse|rotwein|portwein|madeira|marsala|burgunder|jager|zwiebelsosse|rosinensosse/;
const VEGAN_WORD = /vegan|tofu|falafel|linsen|kichererbsen|sin carne|hummus|pomodoro|arrabbiata|aglio e olio|glasnudeln|sushireis|edamame|sojasosse|erdnusssosse|sweet-chili|sweet chili/;
const DAIRY = /skyr|kefir|panna cotta|cheesecake|brulee|tiramisu|mousse|pudding|bayrische creme|flammerie|milchreis(?!.*hafer)|quarkcreme|joghurtcreme|mascarponecreme|caprese|mozzarella|rollchen|involtini|schiffchen|gefullte champignons|parmigiana|butter|sahne|rahm|kase|joghurt|quark|schmand|parmesan|mozzarella|feta|halloumi|ricotta|mascarpone|gorgonzola|paneer|spiegelei|honig|bechamel|gratin|puree|stampf|hollandaise|aioli|remoulade|tzatziki|panier|nuggets|kaiserschmarrn|reibekuchen|pesto|cordon|stroganoff|fricassee|korma|masala|tikka|risotto|lasagne|cannelloni|ravioli|tortelloni|gnocchi|spatzle|tagliatelle|bandnudel|kroketten|burger|shakshuka|pizza|hirtenkase|schnitzel|backfisch|backhendl|wiener|klopse|frikadelle|hackbraten|knodel(?!.*kartoffel)|gyoza|kase|zwetschgenroster|apfelmus/;
const PORK = /chorizo|rahmschnitzel|jagerschnitzel|zigeunerschnitzel|schwein|speck|schinken|bacon|kassler|rippchen|bratwurst|schaufele|leberkase|porchetta|pulled pork|spare ribs|salami|saltimbocca|cordon bleu|klopse|schweinehaxe/;
const ALC = /riesling|prosecco|sekt\b|(?<!sch)wein(?!blatt)|portwein|madeira|marsala|bier|whiskey|rum\b|likor|amaretto|grappa|cognac|kirsch|sherry|coq au vin|burgunder|vin\b/;
const GLUTEN = /nudel|spatzle|panier|backfisch|backhendl|schnitzel|cordon|nugget|couscous|bulgur|ravioli|tortelloni|cannelloni|lasagne|gnocchi|schupfnudel|baguette|fladenbrot|semmel|serviettenknodel|pizza|croutons|blatterteig|frikadelle|hackbraten|hackfleischballchen|klopse|burger|wiener|spaghetti|penne|tagliatelle|pasta|tortilla|burrito|taco|fruhlingsroll|gyoza|kaiserschmarrn|reibekuchen|bechamel|teriyaki|sojasosse|hoisin|austern|kroketten|fischstabchen|rahmschnitzel|gemuseschnitzel|stroganoff|falafel|gulaschsuppe|leberkase|bratwurst|brot|pad thai|kung pao|suss-sauer|sweet-chili|chop suey|gebratene nudeln|knodel(?!.*kartoffel)|kartoffelknodel(?=.*semmel)/;
const EI = /eiersalat|eier\b|^ei\b|bio-ei|ruhrei|bami goreng|spatzle|panier|backfisch|backhendl|schnitzel|nugget|cordon|kaiserschmarrn|reibekuchen|remoulade|aioli|hollandaise|frikadelle|hackbraten|klopse|semmelknodel|serviettenknodel|ravioli|tortelloni|cannelloni|lasagne|gnocchi|tagliatelle|bandnudel|spiegelei|kroketten|burger|shakshuka|nudeln(?!.*vegan)|spaghetti(?! aglio)|penne(?! arrabbiata)|pasta(?!.*vegan)|fruhlingsroll|gyoza|pad thai|hackfleischballchen|fricassee|wiener/;

function analyse(c) {
  const n = norm(c.name);
  const f = { allergene: [] };
  const isMeat = (MEAT.test(n) && !/^vegan/.test(n)) || (SOFT_MEAT.test(n) && !VEGGIE_MARK.test(n)) || (c.role === 'S' && STOCK.test(n));
  const isFish = FISH.test(n.replace(/schweinelachs/g, ''));
  f.vegetarisch = !isMeat && !isFish && !(c.role === 'S' && /thunfisch|sardelle|austern/.test(n));
  const veganName = /vegan|alpro/.test(n) && !/^vegan.*(kase|joghurt)/.test(n);
  f.vegan = f.vegetarisch && (veganName || (!DAIRY.test(n) && !EI.test(n) && !/gefullte (paprika|zucchini|auberginen)/.test(n)));
  f.schwein = PORK.test(n) || (/frikadell|klopse/.test(n) && !/hahnchen|kalb|gemuse|fisch|rind|vegan|veggie/.test(n)) || (/bratwurst/.test(n) && !/vegan/.test(n));
  f.alkohol = ALC.test(n);
  f.helal = !f.schwein && !f.alkohol;
  f.gluten = GLUTEN.test(n);
  f.laktose = DAIRY.test(n);
  const al = f.allergene;
  if (f.gluten) al.push('Gluten');
  if (f.laktose) al.push('Milch/Laktose');
  if (EI.test(n)) al.push('Ei');
  if (FISH.test(n.replace(/schweinelachs/g, '')) && !/garnele|scampi|gambas|shrimp|muschel|calamari|tintenfisch|vongole/.test(n) || /sardelle|thunfisch|worcester/.test(n)) al.push('Fisch');
  if (/garnele|scampi|gambas|shrimp|paella|meeresfruchte/.test(n)) al.push('Krebstiere');
  if (/muschel|calamari|tintenfisch|vongole|paella|meeresfruchte/.test(n)) al.push('Weichtiere');
  if (/mandel|nuss|cashew|pistazie|pinienkern|marzipan/.test(n)) al.push('Schalenfrüchte');
  if (/erdnuss|satay|pad thai/.test(n)) al.push('Erdnüsse');
  if (/soja|tofu|teriyaki|hoisin|edamame/.test(n)) al.push('Soja');
  if (/sellerie|wurzelgemuse|suppengrun/.test(n)) al.push('Sellerie');
  if (/senf|dijon|remoulade/.test(n)) al.push('Senf');
  if (/sesam|tahini|hummus/.test(n)) al.push('Sesam');
  if (/(?<!sch)wein(?!blatt)|balsamico|portwein|madeira|marsala|rosinen/.test(n)) al.push('Sulfite');
  f.allergene = [...new Set(al)];
  if (veganName) { f.laktose = false; f.allergene = f.allergene.filter(a => a !== 'Milch/Laktose' && a !== 'Ei'); }
  return f;
}

function tagsFor(c) {
  const n = norm(c.name);
  const f = c.flags;
  const T = []; // { t, auto }
  const add = (t, auto = true) => { if (!T.some(x => x.t === t)) T.push({ t, auto }); };

  // Küche
  if ((/tikka|masala|tandoori|butter chicken|\bdal\b|korma|rogan josh|paneer|biryani/.test(n)) || (/curry/.test(n) && !/thai|kokos|erdnuss/.test(n))) add('Indisch');
  if (/teriyaki|wok|sojasosse|chop suey|thai|kung pao|satay|hoisin|suss-sauer|pad thai|frühlingsroll|fruhlingsroll|gyoza|pak choi|sushi|poke|edamame|glasnudel|duftreis|jasminreis/.test(n)) add('Asiatisch');
  if (/italien|pasta|risotto|parmesan|pesto|saltimbocca|piccata|arrabbiata|pomodoro|ossobuco|gnocchi|ravioli|tortelloni|tagliatelle|penne|spaghetti|polenta|bistecca|carpaccio|vitello|porchetta|cacciatore|gremolata|cannelloni|lasagne|aglio|basilikum|pizza|toskana/.test(n)) add('Italienisch');
  if (/griech|gyros|souvlaki|tzatziki|feta|hirtenkase|oliven|tomaten-oliven|provenzal|ratatouille|ofengemuse|mediterran|zitronen-kapern|cherrytomaten|balsamico|safran|paella|aioli|knoblauchol|gambas/.test(n)) add('Mediterran');
  if (/orient|couscous|harissa|tajine|kofta|kebab|falafel|hummus|bulgur|tahini|shakshuka|weinblatter|aprikosen|auberginen/.test(n)) add('Orientalisch');
  if (/bbq|buffalo|burger|wings|pulled|spare ribs|brisket|wedges|nuggets|krautsalat|maiskolben|whiskey/.test(n)) add('Amerikanisch');
  if (/chili con carne|burrito|taco|salsa(?! verde)|guacamole|sin carne/.test(n)) add('Mexikanisch');
  if (/schnitzel|rouladen|sauerbraten|spatzle|knodel|klosse|bratwurst|rotkohl|blaukraut|gulasch|sauerkraut|jager|schweinebraten|rinderbraten|haxe|schaufele|kassler|klopse|hackbraten|bratkartoffel|leberkase|rahmwirsing|reibekuchen|kartoffelsalat|backhendl|fricassee|rosenkohl|tafelspitz|frankfurter|kaiserschmarrn|gansekeule|entenkeule|zwiebelsosse|remoulade|pfeffersosse|kartoffelpuree|kartoffelgratin|salzkartoffel|wiener|schupfnudel|kasespatzle|pellkartoffel/.test(n)) add('Deutsch');
  if (!T.some(x => ['Indisch', 'Asiatisch', 'Italienisch', 'Mediterran', 'Orientalisch', 'Amerikanisch', 'Mexikanisch', 'Deutsch'].includes(x.t))) {
    const k = [...c.kuechen];
    if (k.length === 1 && k[0] !== 'Klassisch' && k[0] !== 'Vegan') add(k[0]);
    else if (k.length === 1 && k[0] === 'Klassisch' && ['H', 'S'].includes(c.role)) add('Klassisch');
  }
  if (/schnitzel|rouladen|sauerbraten|gulasch|(?<!ge)braten|haxe|schaufele|kassler|bratwurst|knodel|klosse|sauerkraut|rotkohl|blaukraut|leberkase|bratkartoffel|rahmwirsing|klopse|reibekuchen|pellkartoffel|backhendl|fricassee|hackbraten|kartoffelpuree|tafelspitz|rosenkohl/.test(n)) { add('bodenständig'); }
  if (/schnitzel|rouladen|sauerbraten|(?<!ge)braten|haxe|schaufele|kassler|knodel|klosse|rotkohl|klopse|backhendl|fricassee|hackbraten|tafelspitz|rahmwirsing/.test(n)) add('gutbürgerlich');
  if (/schnitzel|rouladen|sauerbraten|(?<!ge)braten|haxe|schaufele|gulasch|knodel|klosse|sauerkraut|speck|kassler|leberkase|eintopf|bratkartoffel|klopse|hackbraten/.test(n)) add('deftig');

  // Zielgruppe / Charakter
  const lean = c.role === 'H' && /hahnchenbrust|putenbrust|poulardenbrust|putenstreifen|puten(spiesse|medaillons|rollchen)|hahnchenspiesse|tofu|thunfisch|zander|kabeljau|seelachs|tilapia|pangasius|dorade|wolfsbarsch|garnele|gambas|scampi|rinderfilet|lachs-spiesse|linsen|kichererbsen|hahnchen (teriyaki|piccata)|chicken teriyaki|tandoori|poke|falafel/.test(n)
    && !/panier|schnitzel|speck|rahm|cordon|nugget|wings|frikadelle|stroganoff|backfisch|backhendl|saltimbocca|gefullt/.test(n);
  const heavy = /rahm|panier|speck|sahne|frittiert|knodel|gratin|schwein|\bente|gans|(?<!ge)braten|haxe|gulasch|backfisch|backhendl|cordon|schnitzel|pommes|puree|kroketten|butter(?!\s*chicken)|stampf|rosti|wedges|leberkase|bratwurst|rippchen|kassler|nuggets|burger|hollandaise/.test(n);
  if ((lean && c.role === 'H') || (c.role === 'S' && /tomat|zitron|joghurt|minz|salsa|kapern|dill|pomodoro|arrabbiata|hoisin|teriyaki|thymian|rosmarin|balsamico|kraeuter|kräuter|limette|chimichurri/.test(n) && !/rahm|sahne|butter|mayo|aioli|remoulade/.test(n))
    || (c.role === 'B' && /basmati|jasmin|duftreis|reis|couscous|bulgur|quinoa|schwarzer|salzkartoffel|pellkartoffel|petersilienkartoffel|drillinge|glasnudel|polenta/.test(n) && !/butter|gratin/.test(n))
    || (c.role === 'G' && !/rahm|speck|gratin|butter|sahne/.test(n))) {
    add('Leicht');
  }
  if (lean && c.role === 'H') add('Sportlich');
  if (c.role === 'B' && /quinoa|schwarzer reis|bulgur|couscous/.test(n)) add('Sportlich');
  if (c.role === 'G' && /spinat|brokkoli|erbsen|bohnen|edamame|blumenkohl|pak choi|spargel|wokgemuse|zucchini/.test(n)) add('Sportlich');
  const femaleH = c.role === 'H' && (lean || f.vegetarisch) && !/schnitzel|burger|nuggets|brat|schwein|rind|lamm|wurst/.test(n) && /hahnchenbrust|poulardenbrust|putenbrust|lachs|zander|dorade|wolfsbarsch|thunfisch|garnele|gambas|scampi|tofu|falafel|kabeljau|poke|gemuse|risotto|halloumi|ravioli|tortelloni|spinat|paneer|zucchini|aubergine|linsen|kichererbsen|ricotta/.test(n);
  const femaleOther = (c.role === 'S' && /zitron|kapern|dill|joghurt|minz|salsa verde|pesto|basilikum|tomaten-oliven|safran|limette|tahini|hummus/.test(n)) ||
    (c.role === 'G' && /fenchel|spinat|zucchini|ofengemuse|wokgemuse|pak choi|spargel|cherrytomat|salat|honig-karotten|brokkoli|gegrillt|gebratenes gemuse|edamame|paprikagemuse/.test(n)) ||
    (c.role === 'B' && /couscous|quinoa|bulgur|mediterran|jasmin|polenta|schwarzer reis|glasnudeln/.test(n));
  if (femaleH || femaleOther) add('Female food');
  if (/nugget|fischstabchen|schnitzel|frikadelle|spaghetti|butternudeln|bandnudeln|penne|pommes|puree|kroketten|wedges|reis$|^reis|erbsen|karotten|pizza|lasagne|cannelloni|burger|gnocchi|kaiserschmarrn|reibekuchen|ravioli|kasespatzle|tomatensosse|pomodoro|rahmsosse|spatzle|nudeln|hackfleischballchen|burrito|tacos|pfannkuchen|apfelmus/.test(n) && !/scharf|arrabbiata|chili(?! con)|curry|wein/.test(n)) add('Kinderfreundlich');
  if (/rinderfilet|roastbeef|\bente|entenbrust|gans|poularde|lammkarree|lammkeule|lammkoteletts|kalbsrucken|kalbsmedaillons|ossobuco|spargel|herzogin|portwein|burgunder|madeira|wolfsbarsch|seeteufel|tafelspitz|carpaccio|vitello|truffel|gefullte hahnchenbrust|kalbsbraten|barbarie|marsala|bistecca|rumpsteak/.test(n)) add('Festlich');
  if (/curry|masala|tikka|korma|tandoori|chili|arrabbiata|kung pao|thai|harissa|tajine|kofta|kebab|buffalo|bbq|rogan josh|peperoncini|sriracha|chimichurri|cacciatore|gyros|souvlaki/.test(n)) add('würzig');
  if (/chili(?! con)|arrabbiata|buffalo|kung pao|rogan josh|peperoncini|sriracha|chili con carne/.test(n)) add('scharf');
  if (/geschnetzelt|streifen|gebratene |garnele|gambas|scampi|steak|medaillon|piccata|nugget|gyros|nudeln|reis|pasta|couscous|bulgur|brokkoli|spinat|erbsen|karotten|zucchini|wokgemuse|pak choi|polenta|sosse|dip|salsa|pesto|pomodoro/.test(n) && !/(?<!ge)braten|geschmort|jus|sauerbraten|knodel|gratin|risotto|rouladen|haxe|ossobuco|gulasch|tajine|confit/.test(n)) {
    if (!T.some(x => x.t === 'Zeitintensiv(-)')) add('Schnell');
  }

  // Aufwand, Marge
  if (/(?<!ge)braten|geschmort|schmor|sauerbraten|roulade|gulasch|backchen|haxe|schaufele|ossobuco|tafelspitz|pulled|brisket|tajine|ragout|coq au vin|confit|lasagne|cannelloni|gefullt|panier|cordon|backhendl|backfisch|knodel|klosse|gratin|risotto|falafel|fruhlingsroll|gyoza|ravioli|tortelloni|paella|pizza|klopse|hackbraten|jus\b|rinderbacken|kartoffelsalat|rahmwirsing|schnitzel|wiener|stroganoff|fricassee|porchetta|saltimbocca|cacciatore|piccata/.test(n)) add('Zeitintensiv(-)');
  const lowMargin = c.role === 'H' && /rinderfilet|roastbeef|rumpsteak|hufte|rindersteak|bistecca|carpaccio|lammkarree|lammkoteletts|lammkeule|lammbraten|kalbsrucken|kalbsmedaillons|kalbsschnitzel|wiener|kalbs|vitello|ossobuco|entenbrust|barbarie|gansekeule|lachs|thunfisch|wolfsbarsch|dorade|seeteufel|zander|garnele|scampi|gambas|meeresfruchte|calamari|muschel|vongole|paella|brisket|forelle/.test(n);
  const highMargin = (c.role === 'H' && /hahnchenkeule|hahnchenschenkel|hahnchen-schnitzel|hahnchen geschnetzeltes|putengeschnetzeltes|putenschnitzel|frikadelle|hackfleisch|hackbraten|bratwurst|leberkase|chili con carne|kassler|schweinenacken|schweinebraten|rippchen|pulled|gulasch|fischstabchen|seelachs|pangasius|tilapia|backfisch|nuggets|wings|gyros|schweineschnitzel|rahmschnitzel|buffalo|butter chicken|hahnchen stroganoff|hahnchenbrustfilet|linsen|kasespatzle|gemuselasagne|gemuse-frikadelle|pasta|penne|spaghetti|gnocchi|kartoffel|schupfnudeln|reibekuchen|bohnen-chili|curry|dal|ofenkartoffel|pizza|risotto|kaiserschmarrn|gefullte paprika|cannelloni|ravioli|gebratene nudeln|tofu|serviettenknodel|gemuseschnitzel|falafel/.test(n) && !/rinderfilet|lachs/.test(n))
    || ['B', 'G'].includes(c.role) && !/spargel|herzogin|kroketten|pommes|trüffel|wild/.test(n)
    || (c.role === 'S' && /rahm|tomat|pomodoro|senf|kraeuter|kräuter|bechamel|bbq|curry|joghurt|tzatziki|zwiebel|jager|pfeffer|burger|remoulade|sweet|sojasosse|knoblauch/.test(n));
  if (lowMargin) add('Niedrige Marge(-)');
  else if (highMargin) add('Hohe Marge');

  // Ernährungsformen (aus dem Namen abgeleitet -> immer auto)
  if (f.vegan) add('Vegan'); else if (f.vegetarisch) add('Vegetarisch');
  if (c.role !== 'E') {
    if (f.helal) add('Helal');
    if (!f.gluten) add('gluten frei');
    if (!f.laktose) add('Laktose frei');
  }
  return T;
}

// Gar-Methode laut Hausformeln (Standard ×1,3 / Schmoren ×1,6 / Garzuwachs ×0,5)
function garVorschlag(c) {
  const n = norm(c.name);
  if (c.role === 'H') {
    if (/(?<!ge)braten|geschmort|schmor|sauerbraten|roulade|gulasch|backchen|haxe|ossobuco|tajine|coq au vin|pulled|brisket|ragout|schaufele|kassler|klopse|tafelspitz|rinderbacken|lammkeule|gansekeule|entenkeule|chili con carne|curry|dal|stroganoff|fricassee/.test(n)) return 'schmoren';
    if (/carpaccio|vitello/.test(n)) return 'keiner';
    if (/risotto|pasta|nudeln|spaghetti|penne|tagliatelle|gnocchi|ravioli|tortelloni|spatzle|schupfnudel|lasagne|cannelloni|paella/.test(n)) return 'standard';
    return 'standard';
  }
  if (c.role === 'B') return c.gruppe === 'Reis, Nudeln & Getreide' && !/baguette|fladenbrot|semmel|serviettenknodel/.test(n) ? 'garzuwachs' : 'standard';
  if (c.role === 'G') return 'standard';
  return null;
}

// Eigene Angaben des Nutzers (aus dem Bild) haben Vorrang und sind NICHT als "auto" markiert
const USER = {
  'H|gegrillte hahnchenbrust': {
    tags: ['Leicht', 'Sportlich', 'Helal', 'Female food', 'gluten frei', 'Laktose frei'],
    todo: 'Hähnchenbrust würzen und scharf anbraten, auf 145°C Umluft/66°C Kerntemperatur abschieben, in Scheiben schneiden',
  },
  'H|hahnchen-schnitzel': {
    tags: ['Deutsch', 'Helal', 'Zeitintensiv(-)', 'bodenständig', 'gutbürgerlich'],
    todo: 'Hähnchenbrustfilet aufschneiden, klopfen, würzen und panieren (Mehl->Ei->Paniermehl)',
  },
  'H|butter chicken': {
    tags: ['Indisch', 'Helal', 'würzig', 'international'],
    todo: 'Hähnchen walnussgroß würfeln, würzen, in Butter braten, mit Butter-Chicken-Gewürz abschmecken, Sahne hinzufügen',
  },
};

for (const [key, c] of comps) {
  c.flags = analyse(c);
  c.tags = tagsFor(c);
  c.gar = garVorschlag(c);
  c.todo = '';
  const u = USER[key];
  if (u) {
    c.tags = u.tags.map(t => ({ t, auto: false }));
    c.todo = u.todo;
    c.quelle = 'Nutzer (Bild)';
  }
  c.anzahlGerichte = c.dishIds.length;
  c.kuechen = [...c.kuechen];
}

// ---------- Standardrezepte (rezepte-*.js): Zutaten für 200 g/ml + kurze Zubereitung je Komponente ----------
function parseZutaten(z) {
  return z.split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const m = x.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|EL|TL|Stk|Prise|Bund|Zehe|Zehen|Pck|Blatt|Scheibe|Scheiben|Zweig|Zweige|Spritzer)?$/i);
    if (!m) { console.log('Zutat nicht lesbar:', x); return { name: x, amount: null, unit: '' }; }
    return { name: m[1].trim(), amount: parseFloat(m[2].replace(',', '.')), unit: m[3] || '' };
  });
}
const rezeptMap = new Map();
let rezeptNr = 0;
for (const f of fs.readdirSync(DIR).filter(f => /^rezepte-.*\.js$/.test(f)).sort()) {
  for (const e of require(path.join(DIR, f))) {
    const E = { ...e, datei: f, nr: rezeptNr++ };       // ein Eintrag kann für mehrere Komponentennamen gelten
    for (const n of e.names) if (!rezeptMap.has(norm(n))) rezeptMap.set(norm(n), E);
  }
}
const zuordnung = fs.existsSync(path.join(DIR, 'rezept-zuordnung.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'rezept-zuordnung.json'), 'utf8')) : {};
const ohneRezept = [];
for (const c of comps.values()) {
  const e = rezeptMap.get(norm(c.name));
  c.referenzMenge = 200;
  c.rezeptName = zuordnung[c.role + '|' + c.name] || null;
  if (e) {
    c.zutaten = parseZutaten(e.z);
    c.standardSchritte = e.s;
    c.stdNr = e.nr;
    if (!c.todo) { c.todo = e.s; c.todoQuelle = 'Standardrezept'; } else c.todoQuelle = 'Nutzer';
  } else {
    if (c.todo) c.todoQuelle = 'Nutzer';
    if (!c.rezeptName) ohneRezept.push(c.role + ' | ' + c.name + ' (' + c.gruppe + ')');
  }
}
// ---- Standardrezepte für die Rezepte-Datenbank des Generators (Bezugsmenge 200 g bzw. 200 ml) ----
function rezeptKategorie(c) {
  if (c.role === 'S') return 'sosse';
  if (c.role === 'B') return c.gruppe === 'Brot & Gebäck' ? 'brot' : 'beilage-saettigung';
  if (c.role === 'G') return c.gruppe === 'Salate' ? 'vorspeise' : 'beilage-gemuese';
  if (c.role === 'E') return 'sonstiges';
  if (c.gruppe === 'Desserts') return 'dessert';
  if (c.gruppe === 'Suppen & Eintöpfe') return 'vorspeise';
  if (c.gruppe === 'Aufschnitt & Käse' || c.gruppe === 'Backwaren, Quiches & Wraps') return 'fingerfood';
  return 'hauptgang';
}
const stdByNr = new Map();
for (const c of comps.values()) if (c.stdNr != null) (stdByNr.get(c.stdNr) || stdByNr.set(c.stdNr, []).get(c.stdNr)).push(c);
const crypto = require('crypto');
const stdRezepte = [];
for (const [nr, cs] of stdByNr) {
  const e = [...rezeptMap.values()].find(x => x.nr === nr);
  const namen = [...new Set(cs.map(c => c.name))];
  const name = namen.slice(0, 4).join(' / ') + (namen.length > 4 ? ' / …' : '');
  const fl = cs.some(c => c.role === 'S' || c.gruppe === 'Suppen & Eintöpfe');
  const rec = {
    id: 'std-' + crypto.createHash('sha1').update(name).digest('hex').slice(0, 10),
    name, category: rezeptKategorie(cs[0]), temp: '',
    referenceUnit: { type: 'menge', value: 200, unit: fl ? 'ml' : 'g' },
    ingredients: parseZutaten(e.z).filter(z => z.amount != null).map(z => ({ name: z.name, amount: z.amount, unit: z.unit || 'g' })),
    steps: e.s, quelle: 'Standardrezept (Speisenkatalog)', standard: true,
  };
  stdRezepte.push(rec);
  cs.forEach(c => { if (!c.rezeptName) c.rezeptName = name; });   // Verknüpfung Komponente -> Rezept (nur wenn kein eigenes Rezept zugeordnet ist)
}
fs.writeFileSync(path.join(DIR, 'standard-rezepte.js'), '// Automatisch von build.js erzeugt – nicht von Hand ändern.\nmodule.exports = ' + JSON.stringify({ version: crypto.createHash('sha1').update(JSON.stringify(stdRezepte)).digest('hex').slice(0, 12), recipes: stdRezepte }) + ';\n', 'utf8');
console.log('Standardrezepte für die Rezepte-Datenbank:', stdRezepte.length);
fs.writeFileSync(path.join(DIR, 'rezepte-fehlt.txt'), ohneRezept.sort().join('\n') + '\n', 'utf8');
console.log('Komponenten ohne Zubereitung/Rezept:', ohneRezept.length, '(Liste: rezepte-fehlt.txt)');

// ---------- Fingerfood: alles was "im Glas", "auf Deckel", "Weckglas", "auf Löffel" ... ist ----------
const FF_MARK = /\bglas\b|weckglas|ff-glas|deckel|auf loffel/;
function ffGroup(cs, name) {
  const hs = cs.filter(c => c.role === 'H');
  if (hs.some(c => c.gruppe === 'Desserts')) return 'FF Desserts';
  const lead = cs[0];
  if (lead && (lead.gruppe === 'Salate' || (lead.role === 'H' && /salat/.test(norm(lead.name)) && !/obst|frucht/.test(norm(lead.name))))) return 'FF Salate';
  if (hs.some(c => c.gruppe === 'Aufschnitt & Käse')) return 'FF Aufschnitt & Käse';
  if (hs.some(c => c.gruppe === 'Backwaren, Quiches & Wraps' && /brotchen|kanapee|toast|baguette|sandwich/.test(norm(c.name)))) return 'FF Brötchen & Sandwiches';
  const nonVeg = cs.filter(c => !c.flags.vegetarisch);
  if (nonVeg.length) return nonVeg.every(c => FISH.test(norm(c.name))) ? 'FF Fisch & Meeresfrüchte' : 'FF Fleisch';
  return (cs.every(c => c.flags.vegan) || /\(vegan\)/.test(norm(name))) ? 'FF Vegan' : 'FF Vegetarisch';
}
for (const d of dishes) {
  if (d.gang !== 'Fingerfood Snacks' && FF_MARK.test(norm(d.name))) { d.gangBuero = d.gang; d.gang = 'Fingerfood Snacks'; }
  d.ff = d.gang === 'Fingerfood Snacks';
}

// ---------- 4. Gericht-Tags (Küche + Schnittmengen/Vereinigung) ----------
const DIET = ['Helal', 'gluten frei', 'Laktose frei', 'Vegan', 'Vegetarisch'];
for (const d of dishes) {
  const cs = d.parts.map(p => compById.get(p.comp));
  const all = cs.filter(c => c.role !== 'E' || true);
  const t = [{ t: d.kueche, auto: false }];
  const noExtra = cs.filter(c => c.role !== 'E');
  const everyHas = tag => noExtra.every(c => c.tags.some(x => x.t === tag));
  if (everyHas('Vegan')) t.push({ t: 'Vegan', auto: true });
  else if (everyHas('Vegetarisch') || everyHas('Vegan')) t.push({ t: 'Vegetarisch', auto: true });
  ['Helal', 'gluten frei', 'Laktose frei'].forEach(x => { if (everyHas(x)) t.push({ t: x, auto: true }); });
  const hc = cs.find(c => c.role === 'H');
  ['Leicht', 'Sportlich', 'Female food', 'Kinderfreundlich', 'Festlich', 'würzig', 'scharf', 'deftig', 'Hohe Marge', 'Niedrige Marge(-)'].forEach(x => {
    if (hc && hc.tags.some(y => y.t === x)) t.push({ t: x, auto: hc.tags.find(y => y.t === x).auto });
  });
  if (cs.some(c => c.tags.some(y => y.t === 'Zeitintensiv(-)'))) t.push({ t: 'Zeitintensiv(-)', auto: true });
  else if (cs.every(c => c.tags.some(y => y.t === 'Schnell') || c.role === 'E')) t.push({ t: 'Schnell', auto: true });
  d.tags = t;
  if (d.ff) d.sammlung = ffGroup(cs, d.name); else d.sammlung = hc ? hc.gruppe : (cs.some(c => c.role === 'G' && c.gruppe === 'Salate') ? 'Salate' : ({ Hauptgang: 'Vegetarisch & Vegan', Extras: 'Extras' }[d.gang] || 'Gemüse, Brot & Beilagen'));
  d.allergene = [...new Set(cs.flatMap(c => c.flags.allergene))];
}

// ---------- 5. Ausgabe ----------
const out = {
  meta: {
    titel: 'Speisendatenbank Forks & Friends / Licata',
    erstellt: new Date().toISOString().slice(0, 10),
    hinweis: 'Tags mit auto=true wurden automatisch aus den Namen abgeleitet (vor allem Ernährungsformen/Allergene) und müssen mit der echten Rezeptur geprüft werden. To-Do-Schritte sind noch leer und werden nach und nach ergänzt.',
    legende: { H: 'Hauptkomponente (gelb)', S: 'Soße (türkis)', B1: 'Beilage Kartoffeln & Knödel (blau)', B2: 'Beilage Reis, Nudeln & Getreide (dunkelblau)', G: 'Gemüse (hellgrün)', E: 'Extra (dunkel)' },
  },
  komponenten: [...comps.values()].map(c => ({
    id: c.id, name: c.name, rolle: c.role, sammlung: c.sammlung, gruppe: c.gruppe,
    tags: c.tags, allergene: c.flags.allergene, garMethodVorschlag: c.gar, todo: c.todo,
    todoQuelle: c.todoQuelle || '', referenzMenge: c.referenzMenge, zutaten: c.zutaten || null, rezeptName: c.rezeptName,
    veg: !!c.flags.vegetarisch, vegan: !!c.flags.vegan, fisch: FISH.test(norm(c.name)),
    quelle: c.quelle || 'auto', kuechen: c.kuechen, anzahlGerichte: c.anzahlGerichte,
  })),
  gerichte: dishes.map(d => ({ id: d.id, name: d.name, kueche: d.kueche, gang: d.gang, ff: d.ff, gangBuero: d.gangBuero, quelle: d.quelle, sammlung: d.sammlung, teile: d.parts, tags: d.tags, allergene: d.allergene })),
};
fs.writeFileSync(path.join(DIR, 'speisendatenbank.json'), JSON.stringify(out, null, 1), 'utf8');
fs.writeFileSync(IDS_FILE, JSON.stringify(REG, null, 0), 'utf8');

const tpl = fs.readFileSync(path.join(DIR, 'katalog-template.html'), 'utf8');
const html = tpl.replace('/*__DB__*/null', () => JSON.stringify(out));
fs.writeFileSync(path.join(DIR, 'speisenkatalog.html'), html, 'utf8');
// Schlanke Komponentenliste für den Küchensheet-Generator (To-Do-Erkennung): Name, Art, Gruppe, Garmethode, To-Do-Text
const slim = out.komponenten.map(c => ({ id: c.id, name: c.name, rolle: c.rolle, gruppe: c.gruppe, gar: c.garMethodVorschlag || null, todo: c.todo || '', quelle: c.todoQuelle || '', zutaten: c.zutaten || null, rezept: c.rezeptName || null }));
// Aliase: so wie ein Gericht im Katalog geschrieben ist (z. B. "Tortelloni gefüllt mit Spinat und Ricotta"), wenn es vom Komponentennamen abweicht
const aliasSet = new Map();
const compNameById = new Map(out.komponenten.map(c => [c.id, c]));
for (const g of out.gerichte) for (const p of g.teile) {
  const c = compNameById.get(p.comp);
  if (!c || c.rolle === 'E') continue;
  const t = p.text.trim();
  // nur mehrteilige Schreibweisen: Einzelwörter wie "Vegan", "Hackfleisch" oder "Champignons" wären zu unspezifisch
  if (t.length < 4 || !/[\s-]/.test(t) || t.split(/\s+/).length > 7 || norm(t) === norm(c.name)) continue;
  aliasSet.set(norm(t) + '|' + c.id, [t, c.id]);
}
const out2 = { komponenten: slim, aliase: [...aliasSet.values()] };
fs.writeFileSync(path.join(DIR, 'katalog-komponenten.js'), '// Automatisch von build.js erzeugt – nicht von Hand ändern.\nmodule.exports = ' + JSON.stringify(out2) + ';\n', 'utf8');
// Für den Server als JS-Modul (wird beim Deploy automatisch mit eingepackt)
fs.writeFileSync(path.join(DIR, 'katalog-html.js'), '// Automatisch von build.js erzeugt – nicht von Hand ändern.\nmodule.exports = ' + JSON.stringify(html) + ';\n', 'utf8');

// Kurzstatistik
const byS = {};
out.komponenten.forEach(c => { const k = c.sammlung + ' / ' + c.gruppe; byS[k] = (byS[k] || 0) + 1; });
console.log('Gerichte:', out.gerichte.length, '| Komponenten:', out.komponenten.length);
console.log(Object.entries(byS).sort().map(([k, v]) => k + ': ' + v).join('\n'));
const dishByG = {};
out.gerichte.forEach(g => dishByG[g.sammlung] = (dishByG[g.sammlung] || 0) + 1);
console.log('\nGerichte je Sammlung:', JSON.stringify(dishByG));


