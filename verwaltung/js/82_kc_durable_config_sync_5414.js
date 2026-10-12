/* KC Verwaltung – DEPRECATED compatibility shim.
   Die Konfigurationsdaten werden ausschließlich vom zentralen KNGCloudSync verwaltet.
   Kein eigener Supabase-Schreibpfad mehr, damit Einstellungen/Rollen nicht doppelt
   oder in falscher Reihenfolge synchronisiert werden. */
(function(){
  'use strict';
  const CONFIG_KEYS=['settings','userPrefs','roleAssignments','roles'];
  async function syncNow(){
    if(!window.KNGCloudSync?.syncNow) return false;
    return window.KNGCloudSync.syncNow();
  }
  window.KCDurableConfigSync={
    version:'54.8.18-delegated',
    deprecated:true,
    syncNow,
    isInitialized:()=>!!window.KNGCloudSync?.isHydrated?.(),
    keys:[...CONFIG_KEYS]
  };
})();
