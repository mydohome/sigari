export interface CigarPart {
  numero: number;
  nome: string;
  descrizione: string;
}

export interface LeafType {
  nome: string;
  ruolo: string;
  caratteristiche: string;
}

export interface WrapperColor {
  nome: string;
  codice_colore: string;
  descrizione: string;
}

export interface VitolaFormat {
  nome: string;
  lunghezza: string;
  ceppo: string;
  durata_tipica: string;
  profilo: string;
}

export const PARTI_SIGARO: CigarPart[] = [
  {
    numero: 1,
    nome: "Piede (Pie)",
    descrizione: "L'estremità aperta del sigaro che si accende. Va tostata delicatamente ruotando il sigaro a 45° sopra la fiamma viva o con legnetto di cedro, senza bruciare direttamente la foglia di capa."
  },
  {
    numero: 2,
    nome: "Capa (Fascia)",
    descrizione: "La foglia più esterna, nobile ed elastica, che avvolge il sigaro. Conferisce bellezza estetica, finezza tattile e circa il 20-30% degli aromi iniziali."
  },
  {
    numero: 3,
    nome: "Anilla (Fascetta)",
    descrizione: "La fascetta in carta litografata con rilievi dorati che certifica marchio e lignaggio. Spesso lasciata durante il primo terzo di fumata per evitare di lacerare la capa con il calore."
  },
  {
    numero: 4,
    nome: "Capote (Sottofascia)",
    descrizione: "La foglia intermedia che racchiude saldamente il ripieno (tripa) conferendo forma cilindrica uniforme e garantendo la corretta canalizzazione del fumo."
  },
  {
    numero: 5,
    nome: "Tripa (Anima / Ripieno)",
    descrizione: "Il cuore della miscela (ligada). Nei sigari premium fatti a mano è sempre 'tripa larga' (foglie intere ripiegate a fisarmonica), garanzia di tiraggio costante e complessità."
  },
  {
    numero: 6,
    nome: "Testa (Cabeza)",
    descrizione: "L'estremità arrotondata chiusa da cui si aspira. Si incide con precisione con ghigliottina, forbici da fumo o punzone per liberare il flusso senza sfilacciare."
  },
  {
    numero: 7,
    nome: "Cappuccio (Perilla / Cap)",
    descrizione: "Il dischetto di foglia di capa applicato con colla vegetale naturale (gomma arabica) per sigillare l'estremità finale prima del taglio."
  }
];

export const FOGLIE_TRIPA: LeafType[] = [
  {
    nome: "Volado",
    ruolo: "Foglie basali della pianta",
    caratteristiche: "Raccolte alla base del cespo: eccellente combustibilità, corpo leggero, regolatore essenziale della velocità di combustione."
  },
  {
    nome: "Seco",
    ruolo: "Foglie del terzo mediano",
    caratteristiche: "Sottili, delicate e ricchissime di composti aromatici essenziali. È l'anima olfattiva e aromatica del bouquet."
  },
  {
    nome: "Ligero",
    ruolo: "Foglie della corona superiore",
    caratteristiche: "Molto esposte al sole caraibico, spesse, oleose, cariche di nicotina e forza. Bruciano lentamente e conferiscono potenza."
  },
  {
    nome: "Medio Tiempo",
    ruolo: "Due foglioline apicali rare",
    caratteristiche: "Presenti solo su alcune piante vigorose. Usate nei sigari di massimo prestigio (es. Cohiba Behike) per intensità ineguagliabile."
  }
];

export const COLORI_CAPA: WrapperColor[] = [
  { nome: "Claro (Double Claro)", codice_colore: "#a89b6b", descrizione: "Verdolino o paglierino chiaro. Foglie essiccate rapidamente a calore controllato, gusto erbaceo e leggero." },
  { nome: "Colorado Claro", codice_colore: "#b88a57", descrizione: "Tonalità nocciola dorata tipica delle foglie Connecticut Shade o Habano chiaro. Setosa e rotonda." },
  { nome: "Colorado", codice_colore: "#9b6037", descrizione: "Marrone rossiccio brillante con riflessi ramati. Ottima maturazione, aromi ricchi di cedro e spezie." },
  { nome: "Colorado Maduro", codice_colore: "#6c3e23", descrizione: "Marrone scuro intenso. Foglie ricche di oli essenziali, sentori di chicco di caffè tostato e cacao amaro." },
  { nome: "Maduro", codice_colore: "#4a2614", descrizione: "Quasi bruno-cioccolato fondente dopo lunga fermentazione naturale. Note dolciastre, tostate e speziate." },
  { nome: "Oscuro (Negro)", codice_colore: "#281711", descrizione: "Nero pece con texture rugosa e fitta. Fermentazione prolungata ad alta temperatura, fumo denso e vischioso." }
];

export const FORMATI_VITOLAS: VitolaFormat[] = [
  { nome: "Robusto", lunghezza: "124 mm", ceppo: "50 (19.8 mm)", durata_tipica: "45 - 60 min", profilo: "Il formato contemporaneo più amato al mondo per equilibrio e tempo di degustazione." },
  { nome: "Mareva / Petit Corona", lunghezza: "129 mm", ceppo: "42 (16.7 mm)", durata_tipica: "35 - 45 min", profilo: "La vitola da banco per eccellenza: fumo concentrato, ideale per aperitivi o pause veloci." },
  { nome: "Corona Gorda / Toro", lunghezza: "143 - 152 mm", ceppo: "46 - 52 (18 - 20 mm)", durata_tipica: "60 - 80 min", profilo: "Evoluzione perfetta in tre terzi: fumo fresco e aromatico nella prima metà, potenza nel finale." },
  { nome: "Pirámide / Torpedo", lunghezza: "156 mm", ceppo: "52 (20.6 mm)", durata_tipica: "70 - 90 min", profilo: "Forma a cono rastremata che convoglia gli aromi al palato in modo sempre più concentrato." },
  { nome: "Churchill / Julieta No. 2", lunghezza: "178 mm", ceppo: "47 (18.6 mm)", durata_tipica: "90 - 110 min", profilo: "Il formato regale per dopocena riflessivi, amato da Sir Winston Churchill." },
  { nome: "Toscano (Bitroncoconico)", lunghezza: "155 - 165 mm", ceppo: "36 - 39 mm al ventre", durata_tipica: "60 - 85 min intero, 30 min ammezzato", profilo: "100% tabacco Kentucky fermentato a fuoco vivo. Si fuma intero ('alla maremmana') o ammezzato." }
];

export const CONSERVAZIONE_REGOLE = [
  {
    titolo: "Regola del 70 / 70",
    valore: "70% UR · 20°C (68°F)",
    dettaglio: "L'umidità relativa ottimale oscilla tra il 68% e il 72%. Temperature oltre i 22°C rischiano di risvegliare le larve del 'Lasioderma serricorne' (il famigerato coleottero del tabacco)."
  },
  {
    titolo: "Legno di Cedro Spagnolo",
    valore: "Cedrela Odorata",
    dettaglio: "Non un vero cedro ma una latifoglia tropicale. Assorbe e rilascia umidità con inerzia perfetta, respinge i parassiti ed esalta i profumi naturali del tabacco con note resinose."
  },
  {
    titolo: "Controllo Boveda & Monitoraggio",
    valore: "Buste a 2 vie a membrana",
    dettaglio: "Le buste saline Boveda assorbono o rilasciano vapore acqueo automaticamente. Con i sensori IoT (Home Assistant) puoi monitorare costantemente le oscillazioni diurne."
  },
  {
    titolo: "Separazione Sigari Italiani vs Caraibici",
    valore: "Camere o giare separate",
    dettaglio: "I Toscani a base di tabacco Kentucky sono 'fire-cured' e molto aromatici: conservali in giara o scatola a parte (a 65% UR) per non impregnare le delicate foglie caraibiche d'affumicato."
  }
];
