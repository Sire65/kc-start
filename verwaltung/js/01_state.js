/* Status, Datenmodell, LocalStorage, Protokollbasis */
const APP_VERSION = "KNG Version 1.0 – Test 49.9 Systemcheck Autostart Loginfix";
const STORAGE_KEY = "kng_v1_clean_master_test31_membercards";

const DEFAULT_STATE = {
  settings:{
    clubName:"Köcheclub Werne",
    /* Der Verein besteht seit 1991 (siehe auch die Fusszeile "Copyright 1991 - ...").
       Verwendet wird nur die Jahreszahl; der genaue Tag ist mir nicht bekannt. */
    clubFoundedAt:"1991-01-01",
    /* Kochmuetze oben links in der Seitenleiste. Das Bild lag in der gelieferten ZIP
       unter Zusatz/ mit verstuemmeltem Dateinamen; es liegt jetzt unter assets/ mit
       sauberem Namen.
       WICHTIG: hier die WEISSE Fassung. Die Seitenleiste hat einen dunkelgruenen
       Verlauf (siehe .sidebar in css/style.css) - der schwarze Umriss war darauf fast
       unsichtbar. Nachgemessen an einem Foto der Markenzeile. Die weisse Fassung ist
       aus dem Alphakanal desselben Bildes erzeugt, also formgleich. */
    clubLogoSmallPath:"assets/kochmuetze-koecheclub-weiss.png",
    clubMotto:"Verwaltung · Gemeinschaft · Genuss",
    /* Dieselbe Kochmuetze als Hintergrund der leeren Arbeitsflaeche. Vereinsname und
       "seit 1991" stehen dort als TEXT darunter (#emptyClubName, #emptySinceLine) -
       deshalb ist im Bild bewusst keine Schrift eingebrannt: so bleibt sie scharf,
       und ein spaeterer Namenswechsel muss nicht ins Bild gemalt werden. */
    clubLogoBackgroundPath:"assets/kochmuetze-koecheclub.png",
    clubSpeaker:"",
    deputyClubSpeaker:"",
    treasurer:"",
    deputyTreasurer:"",
    cashAuditor:"",
    clubStreet:"",
    clubPostalCode:"",
    clubCity:"Werne",
    clubPhone:"",
    clubMobile:"",
    clubWebsite:"",
    clubEmail:"",
    bankName:"",
    iban:"",
    bic:"",
    adminPassword:"",
    systemOwnerEmail:"ha-joko@web.de",
    assistantGlobalEnabled:true,
    assistantExternalPrepared:false,
    assistantExternalEndpoint:"",
    navIcons:["dashboard","members","memberCards","workwear","activities","donations","finance","communication","documents","secretariat","inventoryOpen","orders","questionnaire","addresses","phone","calculator","statutes","systemCheck","protocol","logout"],
    protocolMaxEntries:0,
    protocolKeepEntries:10,
    protocolAutoCleanup:false,
    secretariatTheme:"classic",
    secretariatRememberLast:true,
    secretariatLightsOut:true,
    secretariatClock:true
  },
  workwearArticles:[
    {article:"Kochjacke", defaultSize:"", price:0},
    {article:"Polo-Shirt", defaultSize:"", price:0},
    {article:"Hose", defaultSize:"", price:0},
    {article:"Schuhe", defaultSize:"", price:0}
  ],
  workwearIssues:[],
  workwearOrders:[],
  session:{
    isLoggedIn:false,
    userName:"Gast",
    role:"Gast",
    loginSince:""
  },
  ui:{
    sidebarCollapsed:false,
    sidebarPinned:true,
    pinboardEnabled:false,
    pinboardText:"",
    pinboardX:null,
    pinboardY:null
  },
  communications:[],
  documents:[],
  documentAssignments:[],
  documentReminders:[],
  documentLog:[],
  userPrefs:{},
  roleAssignments:[],
  roles:{
    Systeminhaber:{startView:"secretariat",rights:["*"]},
    Admin:{startView:"secretariat",rights:["*"]},
    Clubsprecher:{startView:"secretariat",rights:["secretariat.view","members.read","members.write","members.card","addresses.read","addresses.write","documents.read","documents.write","communication.read","communication.write","activities.read","activities.write","questionnaire.read","questionnaire.write","protocol.read"]},
    Kassierer:{startView:"secretariat",rights:["secretariat.view","finance.read","finance.write","documents.read","documents.write","communication.read"]},
    "Vertreter Kassenwart":{startView:"secretariat",rights:["secretariat.view","finance.read","finance.write","documents.read","documents.write","communication.read"]},
    Dienstplaner:{startView:"secretariat",rights:["secretariat.view","shifts.read","shifts.write","activities.read","activities.write","documents.read","documents.write","communication.read"]},
    Einkauf:{startView:"secretariat",rights:["secretariat.view","shopping.read","shopping.write","inventory.read","inventory.write","documents.read","documents.write"]},
    Mitglied:{startView:"secretariat",rights:["secretariat.view","own.read","shifts.read","communication.read"]},
    Gast:{startView:"guestHome",rights:[]}
  },
  protocol:[],
  backupProtocol:[],
  systemCheckProtocol:[],
  officeProtocol:[],
  /* Grossinventar des Vereins. Quelle: Papier-Inventarliste "Grossinventar KC-F07"
     vom 15.08.2026, aufgenommen von Christina - Blatt 1 bis 3 (lfd. Nr. 1-26).
     Je Stueck ein Eintrag, deshalb 30 Karten aus 26 Papierzeilen
     (Gaskocher 3, Haengeschrank 2, Feuerloescher 2).
     Preis, Kaufdatum, Hersteller und Lieferant stehen auf der Liste NICHT und
     bleiben leer - sie werden spaeter nachgetragen. */
  inventory:[] /* Web-Ausgabe: Daten nur nach Anmeldung aus Supabase */,
  members:[] /* Web-Ausgabe: Daten nur nach Anmeldung aus Supabase */,
  addresses:[] /* Web-Ausgabe: Daten nur nach Anmeldung aus Supabase */,
  /* Die drei Spenden des Jahres stehen als Ausgabe in den Finanzen - erzeugt in genau
     der Form, die das Spendenmodul selbst ueber "Betrag an Finanzen uebergeben" anlegt
     (sourceModule/sourceId), damit Loeschen und Neuuebergabe im Modul weiter greifen. */
  finance:[] /* Web-Ausgabe: Daten nur nach Anmeldung aus Supabase */,
  /* Beschlossen am 04.07.2026, Scheckuebergabe am 04.09.2026. Uebergabeort SPD-Buero am Roggenmarkt; die Uebergabeart kann spaeter auf Ueberweisung geaendert werden. */
  donations:[] /* Web-Ausgabe: Daten nur nach Anmeldung aus Supabase */,
  activities:[],
  payments:[],
  bankBalances:[],
  colors:{
    bg:"#f4f7f3",
    panel:"#ffffff",
    primary:"#2f6b3f",
    primaryDark:"#234d2e",
    text:"#1f2a1f",
    line:"#dfe6dc",
    statusActive:"#eaf6ed",
    statusPassive:"#eef5ff",
    statusHonorary:"#f4ecff",
    statusExited:"#fff3e8",
    statusGuest:"#f1f0ec",
    statusTemp:"#eaf3f4",
    statusMissing:"#fff9d8",
    chart1:"#2f6b3f",
    chart2:"#e74c3c",
    chart3:"#3498db",
    chart4:"#f1c40f",
    chart5:"#9b59b6",
    chart6:"#1abc9c",
    chart7:"#e67e22",
    chart8:"#34495e",
    chart9:"#ff6b81",
    chart10:"#00a8ff",
    chart11:"#badc58",
    chart12:"#8e44ad",
    dashboardChartColors:true,
    dashboardTableColors:true,
    pinboardNote:"#fff36d",
    pinboardPin:"#d71920",
    digitalClock:"#75ff75"
  },
  combos:{
    salutation:["","Herr","Frau","Divers"],
    titles:["","Dr.","Prof.","Prof. Dr.","Dipl.-Ing.","Meister"],
    exitReasons:["","freiwillig","verzogen","verstorben","Ausschluss","sonstiges"],
    /* Mitgliedsart. "Gast" und "Aushilfe" sind KEINE Mitglieder - sie zaehlen in keiner
       Mitgliederauswertung mit (siehe istVereinsmitglied in js/03_dashboard.js) und werden
       an die anderen Programme eigens uebersetzt (siehe js/70_personenstatus_uebersetzung.js).
       Die Reihenfolge bestimmt die Reihenfolge im Auswahlfeld. */
    memberType:["","Aktiv","Passiv","Ehrenmitglied","Gast","Aushilfe"],
    clubFunction:["","Mitglied","Vorstand","Kassierer","Schriftführer","Helfer"],
    availability:["","Flexibel","Morgens","Mittags","Abends","Nicht verfügbar"],
    shiftPreference:["","Morgens","Mittags","Abends","Flexibel","Keine Präferenz"],
    preferredDeployment:["","Vorne","Hinten","Beides"],
    professions:["","Hausfrau","Rentner","Koch","Köchin","Koch/Köchin","Konditor","Konditorin","Elektriker","EDV","Selbstständig","Angestellte/r","Arbeiter/in","Beamte/r","sonstiges"],
    committees:["","Service (Vorne)","Nachschub (Hinten)","Vorbereitung","Finanzen","Wartung","Planung","Admin","Technik","Innovation","Dienstplanung","Satzung"],
    banks:["","Sparkasse Werne"],
    financeCategories:["","Standgebühr","Wareneinkauf","Getränke","Dekoration","Geräte / Miete","Werbung","Sonstiges","Verkaufserlöse","Spenden","Mitgliedsbeiträge"],
    paymentIncomeReasons:["","Beitrag","Spende","Rückzahlung","Sonstiges"],
    paymentExpenseReasons:["","Gratifikation","Auslage","Erstattung","Sonstiges"],
    shoppingCategories:["","Lebensmittel","Getränke","Verpackung","Dekoration","Reinigung","Verbrauchsmaterial","Sonstiges"],
    shoppingStatus:["","offen","bestellt","teilweise gekauft","gekauft","storniert"],
    suppliers:["","Metro","Selgros","REWE","EDEKA","Lokaler Lieferant"],
    skillSearchTerms:["","Elektriker","Excel","Hygiene","Anhängerführerschein","Erste Hilfe","Brandschutzhelfer","HACCP","PC-Kenntnisse","Grillmeister","Fritteuse","Staplerschein"],
    mobility:["","Zug","Bus","Miet-Bulli","PKW","Fahrrad","zu Fuß","sonstiges"],
    bookingType:["","selber organisiert","Reisebüro","sonstiges"],
    donationTransferType:["","Persönliche Übergabe","Überweisung"],
    workwearSizesJacket:["","XS","S","M","L","XL","XXL","3XL","48","50","52","54","56","58","60"],
    workwearSizesPolo:["","XS","S","M","L","XL","XXL","3XL"],
    workwearSizesPants:["","44","46","48","50","52","54","56","58","60","62"],
    workwearSizesShoes:["","38","39","40","41","42","43","44","45","46","47","48"],
    orderTypes:["Dienstkleidung","Lebensmittel","Getränke","Inventar","Hygiene","Sonstiges"],
    addressCategories:["","Mitglied","Lieferant","Mitarbeiter","Spender","Sponsor","Stadtmarketing","Presse","Behörde","Verein","Sonstige"],
    questionnaireStatus:["","ausgegeben","zurück erhalten","geprüft","eingepflegt"],
    specialQualifications:["","Meister","Küchenmeister","Vorarbeiter","Ausbilder","Hygienebeauftragter","Ersthelfer","Brandschutzhelfer","Sicherheitsbeauftragter","Datenschutzbeauftragter","Sonstige"],
    skillLevels:["","Grundkenntnisse","Gut","Sehr gut","Experte"],
    kitchenCompetencies:["Grill","Bankett","Frühstück","À-la-carte","Catering","Front-Cooking","Patisserie","Buffets","Veranstaltungsservice","Suppen / Saucen","Fritteuse","Hygiene / HACCP"],
    craftSkills:["Elektro","Sanitär","Holz","Garten","Maler","Schlosser","Dekoration","Aufbau / Abbau","Reparaturen","Sonstige"],
    itSkills:["Word","Excel","Outlook","PowerPoint","HTML","VBA","Vereinssoftware","KI / ChatGPT","Drucker / Scanner","Netzwerk / WLAN"],
    organizationSkills:["Dienstplanung","Einkauf","Logistik","Kasse","Veranstaltungsleitung","Mitgliederbetreuung","Pressearbeit","Sponsorenkontakt","Inventarverwaltung"],
    licenses:["AM","A1","A","B","BE","C1","C","CE","D","Stapler"],
    certificates:["Ersthelfer","Hygiene","Brandschutzhelfer","Staplerschein","Motorsäge","Datenschutz","Belehrung Infektionsschutz","Sonstige"],
    communicationWays:["E-Mail","Telefon","Mobil","WhatsApp","Signal","Threema","SMS","Brief"],
    documentTypes:["Satzung erhalten","Datenschutzerklärung","Fotoerlaubnis","Homepage-Einwilligung","Hygienebelehrung","Führerschein-Kopie","Bescheinigung","Sonstiges"],
    documentCategories:["","Rechnung","Lieferschein","Vertrag","Satzung","Protokoll","Presseartikel","Pressefoto","Mitgliederunterlage","Gesundheitszeugnis","Dienstplan","Inventarunterlage","Bedienungsanleitung","Versicherung","Behördenunterlage","Sonstiges"],
    documentStatus:["","offen","geprüft","erledigt","archiviert","abgelaufen","gelöscht"],
    documentConfidentiality:["öffentlich","intern","Vorstand","Admin","vertraulich"],
    documentReminderReasons:["","prüfen","verlängern","beantworten","bezahlen","unterschreiben","erneuern","archivieren"],
    interests:["Kochen","Grillen","Backen","Reisen","Garten","Handwerk","EDV","Vereinsarbeit","Organisation"],
    hobbies:["Kochen","Backen","Grillen","Garten","Reisen","Musik","Sport","Handwerk","Lesen","Sonstiges"],
    communicationTemplates:["Einladung","Rundschreiben","Geburtstagsgruß","Erinnerung","Jubiläum","Dienstplan-Info","Bitte um Rückmeldung"]
  }
};

// 54.8.20 Startfix: Die Pflichtwerte muessen VOR dem ersten loadState() angelegt sein. Vorher lief
// migrateState() -> normalizeCombos() in die zeitliche Sperrzone der const (ReferenceError) und
// loadState() fiel bei JEDEM Start still auf den Auslieferungsstand zurueck (lokale Daten ignoriert).
const COMBO_PFLICHTWERTE={
  memberType:["Aktiv","Passiv","Ehrenmitglied","Gast","Aushilfe"],
  committees:["Service (Vorne)","Nachschub (Hinten)","Vorbereitung","Finanzen","Wartung","Planung","Admin","Technik","Innovation"]
};

let state = loadState();
// RC14: Eine gespeicherte fachliche Sitzung darf einen neuen Programmstart nicht
// als bereits angemeldet erscheinen lassen. Nur eine Laufzeitsitzung dieses Tabs
// darf erhalten bleiben; ansonsten beginnt KC Verwaltung sauber am Login.
try{
  if(sessionStorage.getItem("kc_manager_runtime_login")!=="1"){
    state.session=clone(DEFAULT_STATE.session);
  }
}catch(_e){ state.session=clone(DEFAULT_STATE.session); }
window.state = state;
window.DEFAULT_STATE = DEFAULT_STATE;
window.__kngStateRef = state;
let settingsSnapshot = "";
let pendingPasswordSetupUser = "";

function clone(obj){return JSON.parse(JSON.stringify(obj));}

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : clone(DEFAULT_STATE);
    const migrated = migrateState(parsed);
    try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(migrated)); }
    catch(saveError){ console.warn("Datenmigration konnte noch nicht gespeichert werden.",saveError); }
    return migrated;
  }catch(err){
    console.error(err);
    return clone(DEFAULT_STATE);
  }
}

/* Einmalige Komplettstand-Migration 02.09.2026:
   Bereits erfasste Benutzerdaten bleiben maßgeblich. Fehlende, mit dem
   Komplettpaket ausgelieferte Inventar-, Spenden- und Finanzdatensätze
   werden anhand stabiler Schlüssel genau einmal ergänzt. */
function mergeSeedRecords(existing,defaults,keyOf){
  const result=clone(Array.isArray(existing)?existing:[]);
  const keys=new Set(result.map(keyOf).filter(Boolean));
  (Array.isArray(defaults)?defaults:[]).forEach(item=>{
    const key=keyOf(item);
    if(key && !keys.has(key)){ result.push(clone(item)); keys.add(key); }
  });
  return result;
}

function migrateState(s){
  const migrationFlags=(s.dataMigrations && typeof s.dataMigrations==="object")?s.dataMigrations:{};
  const importCompleteData=!migrationFlags.completeData20260902;
  const migrateDonationWorkflow=!migrationFlags.donationWorkflow20260902;
  const storedInventory=Array.isArray(s.inventory)?s.inventory:[];
  const storedFinance=Array.isArray(s.finance)?s.finance:[];
  const storedDonations=Array.isArray(s.donations)?s.donations:[];
  const storedPlanning=Array.isArray(s.investmentPlanning)?s.investmentPlanning:[];
  const inventory=importCompleteData
    ? mergeSeedRecords(storedInventory,DEFAULT_STATE.inventory,item=>String(item?.id||item?.no||""))
    : (storedInventory.length?storedInventory:clone(DEFAULT_STATE.inventory||[]));
  const donations=importCompleteData
    ? mergeSeedRecords(storedDonations,DEFAULT_STATE.donations,item=>String(item?.id||item?.donationNo||""))
    : (storedDonations.length?storedDonations:clone(DEFAULT_STATE.donations||[]));
  let finance=clone(storedFinance);
  let investmentPlanning=clone(storedPlanning);
  if(migrateDonationWorkflow){
    const plannedIds=new Set(donations.filter(d=>!d.done).map(d=>String(d.id||"")).filter(Boolean));
    finance=finance.filter(item=>!(item?.sourceModule==="donations"&&plannedIds.has(String(item.sourceId||""))));
    donations.forEach(d=>{
      const id=String(d.id||""); if(!id) return;
      finance=finance.filter(item=>!(item?.sourceModule==="donations"&&String(item.sourceId||"")===id));
      investmentPlanning=investmentPlanning.filter(item=>!(item?.sourceModule==="donations"&&String(item.sourceId||"")===id));
      if(d.done){
        finance.unshift({id:"fin-"+id,type:"Ausgabe",category:"Spenden",subCategory:"Geleistete Spende",date:d.date,year:d.date?new Date(d.date).getFullYear():new Date().getFullYear(),text:`Spende: ${d.name} an ${d.recipient}`,amount:Number(d.amount||0),sourceModule:"donations",sourceId:id,createdAt:new Date().toISOString()});
      }else{
        investmentPlanning.unshift({id:"plan-"+id,date:d.decidedAt||d.date||new Date().toISOString().slice(0,10),source:"Spenden",description:`Spende: ${d.name} an ${d.recipient}`,amount:Number(d.amount||0),status:d.suggested?"Vorschlag":"Planung",sourceModule:"donations",sourceId:id});
      }
    });
  }
  const migrateBierkaemperProfession=false; /* Historische automatische Berufszuweisung deaktiviert. */
  const members=((Array.isArray(s.members) && s.members.length) ? s.members : clone(DEFAULT_STATE.members)).map(m=>({specialQualification:"", specialQualificationOther:"", communicationPreferred:"", interests:[], hobbies:[], ...m}));
  /* Keine automatische Berufsänderung mehr: Mitgliedsstammdaten werden nur manuell gepflegt. */
  return {
    ...clone(DEFAULT_STATE),
    ...s,
    settings:{...clone(DEFAULT_STATE.settings),...(s.settings||{}), navIcons:(()=>{ const arr=Array.isArray(s.settings?.navIcons)?[...s.settings.navIcons]:clone(DEFAULT_STATE.settings.navIcons); if(!arr.includes("workwear")) arr.splice(Math.max(0,arr.indexOf("members")+1),0,"workwear"); if(!arr.includes("documents")){ const ci=arr.indexOf("communication"); arr.splice(ci>=0?ci+1:Math.max(0,arr.length-1),0,"documents"); } if(!arr.includes("inventoryOpen")){ const di=arr.indexOf("donations"); arr.splice(di>=0?di+1:Math.max(0,arr.indexOf("communication")),0,"inventoryOpen"); } return arr; })()},
    session:{...clone(DEFAULT_STATE.session),...(s.session||{})},
    ui:{...clone(DEFAULT_STATE.ui),...(s.ui||{})},
    userPrefs:(s.userPrefs && typeof s.userPrefs==="object")?s.userPrefs:{},
    dataMigrations:{...migrationFlags,completeData20260902:true,donationWorkflow20260902:true,bierkaemperProfession20260902:true},
    roleAssignments:Array.isArray(s.roleAssignments)?s.roleAssignments:[],
    roles:mergeRoles(s.roles),
    protocol:Array.isArray(s.protocol)?s.protocol:[],
    backupProtocol:Array.isArray(s.backupProtocol)?s.backupProtocol:[],
    systemCheckProtocol:Array.isArray(s.systemCheckProtocol)?s.systemCheckProtocol:[],
    officeProtocol:Array.isArray(s.officeProtocol)?s.officeProtocol:[],
    communications:Array.isArray(s.communications)?s.communications:[],
    documents:Array.isArray(s.documents)?s.documents:[],
    documentAssignments:Array.isArray(s.documentAssignments)?s.documentAssignments:[],
    documentReminders:Array.isArray(s.documentReminders)?s.documentReminders:[],
    documentLog:Array.isArray(s.documentLog)?s.documentLog:[],
    workwearArticles:Array.isArray(s.workwearArticles)?s.workwearArticles:clone(DEFAULT_STATE.workwearArticles),
    workwearIssues:Array.isArray(s.workwearIssues)?s.workwearIssues:[],
    workwearOrders:Array.isArray(s.workwearOrders)?s.workwearOrders:[],
    investmentPlanning,
    members,
    addresses:(Array.isArray(s.addresses) && s.addresses.length) ? s.addresses : clone(DEFAULT_STATE.addresses || []),
    inventory,
    finance,
    donations,
    activities:Array.isArray(s.activities)?s.activities:[],
    payments:Array.isArray(s.payments)?s.payments:[],
    bankBalances:Array.isArray(s.bankBalances)?s.bankBalances:[],
    colors:{...clone(DEFAULT_STATE.colors),...(s.colors||{})},
    combos:normalizeCombos({...clone(DEFAULT_STATE.combos),...(s.combos||{})})
  };
}


function normalizeComboValues(values){
  const result=[""];
  (Array.isArray(values)?values:[]).forEach(v=>{
    const text=String(v ?? "").trim();
    if(text && !result.includes(text)) result.push(text);
  });
  return result;
}

/* Werte, auf die sich der Programmcode verlaesst und die deshalb in der Auswahlliste
   vorhanden sein MUESSEN - auch bei einem alten gespeicherten Stand oder nach dem
   Zurueckspielen einer aelteren Sicherung. Ohne das waeren "Gast" und "Aushilfe" bei jedem
   Bestandsnutzer unsichtbar, weil der gespeicherte Array den Standard komplett ersetzt.
   Eigene Werte des Anwenders bleiben unangetastet, die Reihenfolge ebenso; fehlende
   Pflichtwerte werden hinten angehaengt. */
/* COMBO_PFLICHTWERTE steht seit 54.8.20 vor "let state = loadState();" (siehe dort). */

function normalizeCombos(combos){
  const normalized={};
  Object.entries(combos||{}).forEach(([key,values])=>{
    normalized[key]=normalizeComboValues(values);
  });
  Object.entries(COMBO_PFLICHTWERTE).forEach(([key,pflicht])=>{
    if(!Array.isArray(normalized[key])) normalized[key]=[""];
    const vorhanden=normalized[key].map(v=>String(v).trim().toLowerCase());
    pflicht.forEach(wert=>{
      if(!vorhanden.includes(wert.toLowerCase())) normalized[key].push(wert);
    });
  });
  const bereichReihenfolge=COMBO_PFLICHTWERTE.committees;
  const bereichExtras=(normalized.committees||[]).filter(v=>v && !bereichReihenfolge.includes(v));
  normalized.committees=["",...bereichReihenfolge,...bereichExtras];
  return normalized;
}

const COMBO_GROUPS=[
  {title:"Stammdaten / Club",items:[
    {key:"committees",label:"Bereiche / Arbeitsgruppen"},
    {key:"banks",label:"Banken"}
  ]},
  {title:"Mitglieder",items:[
    {key:"salutation",label:"Anrede"},
    {key:"titles",label:"Titel"},
    {key:"memberType",label:"Mitgliedsart"},
    {key:"professions",label:"Berufe"},
    {key:"clubFunction",label:"Funktion im Club"},
    {key:"availability",label:"Verfügbarkeit"},
    {key:"shiftPreference",label:"Schichtpräferenz"},
    {key:"preferredDeployment",label:"Bevorzugter Einsatz"},
    {key:"exitReasons",label:"Austrittsgrund"}
  ]},
  {title:"Fähigkeiten / Qualifikationen",items:[
    {key:"skillSearchTerms",label:"Suchbegriffe Fähigkeiten"}
  ]},
  {title:"Aktivitäten / Ausflüge",items:[
    {key:"mobility",label:"Mobilität"},
    {key:"bookingType",label:"Gebucht / organisiert über"}
  ]},
  {title:"Finanzen",items:[
    {key:"financeCategories",label:"Finanzkategorien"},
    {key:"donationTransferType",label:"Spendenübergabe"},
    {key:"paymentIncomeReasons",label:"Einnahmegründe"},
    {key:"paymentExpenseReasons",label:"Ausgabegründe"}
  ]},
  {title:"Einkauf / Weihnachtsmarkt",items:[
    {key:"shoppingCategories",label:"Einkaufskategorien"},
    {key:"shoppingStatus",label:"Einkaufsstatus"},
    {key:"suppliers",label:"Lieferanten"}
  ]},
  {title:"Adressen / Fragebogen",items:[
    {key:"addressCategories",label:"Adresskategorien"},
    {key:"questionnaireStatus",label:"Fragebogen-Status"},
    {key:"communicationWays",label:"Kommunikationswege"},
    {key:"communicationTemplates",label:"Kommunikationsvorlagen"}
  ]},
  {title:"Dokumentenmanagement",items:[
    {key:"documentCategories",label:"Dokumentkategorien"},
    {key:"documentStatus",label:"Dokumentstatus"},
    {key:"documentConfidentiality",label:"Vertraulichkeit"},
    {key:"documentReminderReasons",label:"Wiedervorlage-Gründe"}
  ]},
  {title:"Mitglieder – Qualifikationen",items:[
    {key:"specialQualifications",label:"Besondere Qualifikationen"},
    {key:"skillLevels",label:"Bewertungsstufen"},
    {key:"kitchenCompetencies",label:"Küchenkompetenzen"},
    {key:"craftSkills",label:"Handwerkliche Fähigkeiten"},
    {key:"itSkills",label:"EDV-Kenntnisse"},
    {key:"organizationSkills",label:"Organisation / Vereinsarbeit"},
    {key:"licenses",label:"Führerscheine"},
    {key:"certificates",label:"Bescheinigungen"},
    {key:"documentTypes",label:"Dokumentarten"},
    {key:"interests",label:"Interessen"},
    {key:"hobbies",label:"Hobbys"}
  ]}
];

function mergeRoles(savedRoles){
  const merged=clone(DEFAULT_STATE.roles);
  Object.entries(savedRoles||{}).forEach(([role,data])=>{
    merged[role]={...(merged[role]||{}),...(data||{})};
    if(!Array.isArray(merged[role].rights)) merged[role].rights=[];
    if(!merged[role].startView || merged[role].startView==="dashboard") merged[role].startView=(DEFAULT_STATE.roles[role]?.startView || "secretariat");
  });
  return merged;
}

function saveState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  updateStatusBar();
}

function logAction(module,action,details="",userOverride=""){
  const now=new Date();
  state.protocol.unshift({
    time:now.toLocaleString("de-DE"),
    iso:now.toISOString(),
    user:userOverride || state.session.userName || "Gast",
    module,action,details
  });
  saveState();
  renderProtocol();
  renderDashboard();
}

function logBackup(action,details=""){
  const now=new Date();
  state.backupProtocol = Array.isArray(state.backupProtocol) ? state.backupProtocol : [];
  state.backupProtocol.unshift({
    date:now.toLocaleDateString("de-DE"),
    time:now.toLocaleTimeString("de-DE"),
    iso:now.toISOString(),
    user:state.session.userName || "Gast",
    action,
    details
  });
  saveState();
  renderBackupProtocol();
}

function logSystemCheck(result,details=""){
  const now=new Date();
  state.systemCheckProtocol = Array.isArray(state.systemCheckProtocol) ? state.systemCheckProtocol : [];
  state.systemCheckProtocol.unshift({
    date:now.toLocaleDateString("de-DE"),
    time:now.toLocaleTimeString("de-DE"),
    iso:now.toISOString(),
    user:state.session.userName || "Gast",
    result,
    details
  });
  saveState();
  renderSystemCheckProtocol();
}

