/* Personenstatus: die eine Übersetzungstabelle für alle Programme.
 * ---------------------------------------------------------------------------------------
 * Warum es diese Datei gibt: die Mitgliedsart heißt in jedem Programm anders. In der
 * Verwaltung "Aktiv/Passiv/Ehrenmitglied/Gast/Aushilfe", in der Datenbank
 * "regular/honorary/guest/employee" mit eigenem Status "active/inactive/former/pending",
 * an der Kasse und in der Zeiterfassung nur "member/helper", im Dienstplan
 * "member/employee/...". Ohne eine gemeinsame Tabelle übersetzt jedes Programm für sich –
 * und dann wird aus einem Gast unterwegs ein vollwertiges aktives Mitglied.
 *
 * Die Zielwerte sind NICHT erfunden. Sie stehen so in der Datenbank:
 *   kc_core_club_memberships.membership_type   CHECK (regular|honorary|guest|employee|other)
 *   kc_core_club_memberships.membership_status CHECK (active|inactive|former|pending)
 *   kc_dp_memberships.role                     CHECK (member|employee|planner|duty_manager|
 *                                                     time_auditor|read_only|admin)
 *   cores/time-clock-core/time-clock-core.js   type = 'helper' oder 'member'
 *
 * Diese Datei ändert von sich aus nichts. Sie stellt window.KCPersonenstatus bereit;
 * benutzt wird sie beim Ausgeben von Daten für ein anderes Programm.
 */
(function(){
  "use strict";

  /* Reihenfolge = Reihenfolge in der Auswahlliste. */
  const TABELLE = [
    {
      verwaltung: "Aktiv",
      istMitglied: true,
      datenbankArt: "regular",   datenbankStatus: "active",
      kasse: "member",           dienstplan: "member",
      erklaerung: "Vollmitglied im Verein."
    },
    {
      verwaltung: "Passiv",
      istMitglied: true,
      datenbankArt: "regular",   datenbankStatus: "inactive",
      kasse: "member",           dienstplan: "member",
      erklaerung: "Mitglied, zurzeit nicht aktiv."
    },
    {
      verwaltung: "Ehrenmitglied",
      istMitglied: true,
      datenbankArt: "honorary",  datenbankStatus: "active",
      kasse: "member",           dienstplan: "member",
      erklaerung: "Mitglied auf Lebenszeit."
    },
    {
      verwaltung: "Gast",
      istMitglied: false,
      datenbankArt: "guest",     datenbankStatus: "active",
      kasse: "helper",           dienstplan: "employee",
      erklaerung: "Kein Mitglied. Hilft mit, zahlt keinen Beitrag, hat keine Ansprüche."
    },
    {
      verwaltung: "Aushilfe",
      istMitglied: false,
      datenbankArt: "employee",  datenbankStatus: "active",
      kasse: "helper",           dienstplan: "employee",
      erklaerung: "Kein Mitglied. Hilft zeitlich befristet mit."
    },
    {
      verwaltung: "Ausgeschieden",
      istMitglied: false,
      datenbankArt: "regular",   datenbankStatus: "former",
      kasse: null,               dienstplan: null,
      erklaerung: "War Mitglied, ist ausgetreten. Wird an Kasse und Dienstplan NICHT übergeben."
    }
  ];

  const nachVerwaltung = new Map(TABELLE.map(z => [z.verwaltung.toLowerCase(), z]));

  /* Fremdschreibweisen, die von außen hereinkommen können. */
  const SCHREIBWEISEN = {
    "aktiv": "Aktiv", "active": "Aktiv", "regular": "Aktiv", "aktives mitglied": "Aktiv",
    "passiv": "Passiv", "inactive": "Passiv", "passives mitglied": "Passiv",
    "ehrenmitglied": "Ehrenmitglied", "honorary": "Ehrenmitglied", "ehre": "Ehrenmitglied",
    "gast": "Gast", "gastmitglied": "Gast", "guest": "Gast",
    "aushilfe": "Aushilfe", "aushilfen": "Aushilfe", "aushilfskraft": "Aushilfe", "employee": "Aushilfe",
    "ausgeschieden": "Ausgeschieden", "ausgetreten": "Ausgeschieden", "former": "Ausgeschieden",
    "ehemalig": "Ausgeschieden", "inaktiv": "Ausgeschieden"
  };

  function zeileFuer(status){
    const schluessel = String(status || "").trim().toLowerCase();
    if(!schluessel) return null;
    const name = SCHREIBWEISEN[schluessel] || null;
    return name ? nachVerwaltung.get(name.toLowerCase()) : (nachVerwaltung.get(schluessel) || null);
  }

  /* Der Verwaltungsstatus eines Mitgliedsdatensatzes - über die vorhandene Funktion des
     Programms, damit hier keine zweite Wahrheit entsteht. */
  function statusVon(mitglied){
    if(typeof window.memberStatus === "function") return window.memberStatus(mitglied);
    return String(mitglied && mitglied.memberType || "").trim() || "Aktiv";
  }

  /* Übersetzung in ein Zielsystem. ziel: "datenbank" | "kasse" | "dienstplan".
     Rückgabe null bedeutet ausdrücklich: diese Person gehört dort nicht hin. */
  function uebersetze(status, ziel){
    const zeile = zeileFuer(status);
    if(!zeile) return null;
    if(ziel === "datenbank") return {membership_type: zeile.datenbankArt, membership_status: zeile.datenbankStatus};
    if(ziel === "kasse")     return zeile.kasse;
    if(ziel === "dienstplan")return zeile.dienstplan;
    return null;
  }

  /* Ein Personensatz, wie ihn die Kasse/Zeiterfassung erwartet. Gibt null zurück, wenn die
     Person dort nicht hingehört (Ausgeschiedene). Der Verwaltungsstatus wird zusätzlich im
     freien Feld "role" mitgegeben, damit die Angabe unterwegs nicht verlorengeht. */
  function personFuerKasse(mitglied){
    const status = statusVon(mitglied);
    const art = uebersetze(status, "kasse");
    if(!art) return null;
    return {
      id: mitglied.id,
      type: art,
      displayName: `${mitglied.firstName || ""} ${mitglied.lastName || ""}`.trim() || mitglied.memberNo || "",
      credential: mitglied.memberNo || "",
      role: status,
      active: status !== "Ausgeschieden"
    };
  }

  /* Alle Personen für die Übergabe, mit einer Zählung zum Gegenprüfen. */
  function paketFuerKasse(){
    const alle = (window.state && Array.isArray(window.state.members)) ? window.state.members : [];
    const personen = [];
    const uebersprungen = [];
    alle.forEach(m => {
      const satz = personFuerKasse(m);
      if(satz) personen.push(satz);
      else uebersprungen.push({memberNo: m.memberNo, grund: statusVon(m)});
    });
    return {
      schema: "KC_TIME_CLOCK_CONFIG_V1",
      erstelltAm: new Date().toISOString(),
      personen,
      uebersprungen,
      zaehlung: {
        mitglieder: personen.filter(p => p.type === "member").length,
        helfer: personen.filter(p => p.type === "helper").length,
        uebersprungen: uebersprungen.length
      }
    };
  }

  window.KCPersonenstatus = {
    TABELLE,
    statusVon,
    uebersetze,
    personFuerKasse,
    paketFuerKasse,
    istMitglied: (status) => !!(zeileFuer(status) || {}).istMitglied
  };
})();

/* Fibu/Konto-Modul separat nachladen, damit die bestehende index.html und Startreihenfolge
   unverändert bleiben. Fehler im optionalen Modul dürfen den Kernstart nicht blockieren. */
(function(){
  "use strict";
  if(document.querySelector('script[data-kc-fibu-konto="1"]')) return;
  const script=document.createElement("script");
  script.src="js/71_fibu_konto.js?v=54.7.9";
  script.async=false;
  script.dataset.kcFibuKonto="1";
  script.addEventListener("error",()=>console.error("KC Fibu/Konto-Modul konnte nicht geladen werden."));
  document.body.appendChild(script);
})();

/* Weihnachtsmarkt-Beschaffung/Logistik separat nachladen. Additiv: bestehendes Bestellwesen bleibt unverändert. */
(function(){
  "use strict";
  if(document.querySelector('script[data-kc-wm-procurement="1"]')) return;
  const script=document.createElement("script");
  script.src="js/86_wm_procurement_logistics.js?v=54.8.17";
  script.async=false;
  script.dataset.kcWmProcurement="1";
  script.addEventListener("error",()=>console.error("KC Weihnachtsmarkt-Beschaffungsmodul konnte nicht geladen werden."));
  document.body.appendChild(script);
})();

/* Inventarfotos und Ausgabegeschirr/Getränkerezept-Verknüpfung separat nachladen. */
(function(){
  "use strict";
  if(document.querySelector('script[data-kc-servingware="1"]')) return;
  const script=document.createElement("script");
  script.src="js/87_inventory_photos_servingware.js?v=54.8.18";
  script.async=false;
  script.dataset.kcServingware="1";
  script.addEventListener("error",()=>console.error("KC Inventarfoto-/Ausgabegeschirrmodul konnte nicht geladen werden."));
  document.body.appendChild(script);
})();

/* Kleininventar / Verbrauchsmaterial. Rezeptzuordnung bleibt bewusst im PC Manager. */
(function(){
  "use strict";
  if(document.querySelector('script[data-kc-small-consumables="1"]')) return;
  const script=document.createElement("script");
  script.src="js/88_kleininventar_verbrauchsmaterial.js?v=54.8.22";
  script.async=false;
  script.dataset.kcSmallConsumables="1";
  script.addEventListener("error",()=>console.error("KC Kleininventar-/Verbrauchsmaterialmodul konnte nicht geladen werden."));
  document.body.appendChild(script);
})();

/* Weihnachtsmarkt-Einkaufsartikelstamm: Lebensmittel, Gratiszugaben und weitere Verbrauchsmaterialien. */
(function(){
  "use strict";
  if(document.querySelector('script[data-kc-wm-purchase-catalog="1"]')) return;
  const script=document.createElement("script");
  script.src="js/89_wm_einkauf_artikelstamm.js?v=54.8.22";
  script.async=false;
  script.dataset.kcWmPurchaseCatalog="1";
  script.addEventListener("error",()=>console.error("KC Weihnachtsmarkt-Einkaufsartikelstamm konnte nicht geladen werden."));
  document.body.appendChild(script);
})();
