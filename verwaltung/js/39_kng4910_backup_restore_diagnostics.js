/* KNG 49.11 – Rücksicherung Diagnose & Stabilisierung
   - behebt fehlende renderStatusLegend-Funktion per sicherem Shim
   - ersetzt importData durch robuste Rücksicherung mit Testmodus
   - erzeugt bei Fehlern eine JSON-Fehlerdatei
   - protokolliert Erfolg/Fehler detailliert
*/
(function(){
  'use strict';

  // Sichere Shims für optionale Anzeigefunktionen, die in älteren/neueren Modulen unterschiedlich heißen können.
  // Wichtig: Einige ältere Dateien rufen diese Funktionen ohne window. und mit optional chaining auf.
  // Ein fehlender globaler Bezeichner verursacht trotzdem ReferenceError. Deshalb als window-Property anlegen.
  if(typeof window.renderStatusLegend !== 'function'){
    window.renderStatusLegend = function(){ return true; };
  }
  if(typeof window.renderSearchExtraColumns !== 'function'){
    window.renderSearchExtraColumns = function(){ return true; };
  }
  if(typeof window.renderStatusLegend === 'function' && typeof renderStatusLegend === 'undefined'){
    var renderStatusLegend = window.renderStatusLegend;
  }
  if(typeof window.renderSearchExtraColumns === 'function' && typeof renderSearchExtraColumns === 'undefined'){
    var renderSearchExtraColumns = window.renderSearchExtraColumns;
  }

  function nowStamp(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
  }

  function safeToast(msg,type){
    if(typeof window.toast === 'function') window.toast(msg,type||'info');
    else console.log(type||'info', msg);
  }

  function safeLogBackup(action,details){
    if(typeof window.logBackup === 'function') window.logBackup(action,details||'');
  }

  function safeLogAction(module,action,details){
    if(typeof window.logAction === 'function') window.logAction(module,action,details||'');
  }

  function downloadJson(filename,obj){
    const text=JSON.stringify(obj,null,2);
    if(typeof window.downloadTextFile === 'function'){
      window.downloadTextFile(filename,text,'application/json;charset=utf-8');
      return;
    }
    const blob=new Blob([text],{type:'application/json;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }

  function makeRestoreDiagnostic(payload){
    const env={
      createdAt:new Date().toISOString(),
      createdAtLocal:new Date().toLocaleString('de-DE'),
      appTitle:document.title,
      user:window.state?.session?.userName || 'Gast',
      role:window.state?.session?.role || 'Gast',
      browser:navigator.userAgent,
      language:navigator.language,
      platform:navigator.platform,
      href:location.href,
      protocol:location.protocol,
      viewport:`${window.innerWidth} x ${window.innerHeight}`,
      screen:`${screen.width} x ${screen.height}`,
      online:navigator.onLine
    };
    return {version:'KNG-Ruecksicherung-Diagnose-49.11', environment:env, ...payload};
  }

  function summarizeStateObject(obj){
    return {
      keys:Object.keys(obj||{}).sort(),
      members:Array.isArray(obj?.members) ? obj.members.length : null,
      protocol:Array.isArray(obj?.protocol) ? obj.protocol.length : null,
      backupProtocol:Array.isArray(obj?.backupProtocol) ? obj.backupProtocol.length : null,
      systemCheckProtocol:Array.isArray(obj?.systemCheckProtocol) ? obj.systemCheckProtocol.length : null,
      settings:!!obj?.settings,
      colors:!!obj?.colors,
      users:Array.isArray(obj?.users) ? obj.users.length : null
    };
  }

  function renderAfterRestore(){
    const calls=['saveState','applyClubBranding','applyColors','renderAll','renderSettings','renderDashboard','renderBackupProtocol'];
    const results=[];
    let criticalError=null;
    for(const fn of calls){
      try{
        if(typeof window[fn] === 'function'){
          window[fn]();
          results.push({step:fn,status:'OK'});
        } else {
          results.push({step:fn,status:'SKIPPED',details:'nicht vorhanden'});
        }
      }catch(err){
        results.push({step:fn,status:'WARNUNG',message:err.message,stack:err.stack});
        // Rendering-Fehler nach erfolgreich übernommener Sicherung dürfen die Rücksicherung nicht abbrechen.
        // Sie werden dokumentiert, aber die Daten bleiben übernommen und gespeichert.
        if(fn==='saveState') criticalError=err;
      }
    }
    if(criticalError) throw criticalError;
    return results;
  }

  function ensureRestoreExtras(){
    const importInput=document.getElementById('importData');
    if(!importInput) return;
    const label=importInput.closest('label');
    if(label){
      label.classList.add('primary','restore-file-button');
      label.style.color='';
      label.style.fontSize='';
      label.style.fontWeight='';
    }
    if(!document.getElementById('restoreDryRun')){
      const box=document.createElement('label');
      box.className='setting-inline restore-dryrun-box';
      box.innerHTML='<input id="restoreDryRun" type="checkbox" checked> Test-Rücksicherung zuerst prüfen';
      label?.insertAdjacentElement('afterend',box);
    }
    if(!document.getElementById('restoreHintText')){
      const hint=document.createElement('p');
      hint.id='restoreHintText';
      hint.className='muted small';
      hint.textContent='Bei Fehlern wird automatisch eine Rücksicherungs-Fehlerdatei erzeugt.';
      document.getElementById('restoreDryRun')?.closest('label')?.insertAdjacentElement('afterend',hint);
    }
  }

  async function readFileText(file){
    return await file.text();
  }

  window.importData = async function importDataWithDiagnostics(file){
    const started=performance.now();
    const filename=file?.name || 'JSON-Datei';
    const dryRun=!!document.getElementById('restoreDryRun')?.checked;
    let text='';
    let parsed=null;
    let migrated=null;
    let lastStep='Start';
    try{
      if(!file) throw new Error('Keine Rücksicherungsdatei ausgewählt.');
      lastStep='Datei lesen';
      text=await readFileText(file);
      if(!text.trim()) throw new Error('Die Rücksicherungsdatei ist leer.');

      lastStep='JSON parsen';
      parsed=JSON.parse(text);

      lastStep='Datenstruktur prüfen';
      if(!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Die Datei enthält keinen gültigen Programm-Datenbestand.');
      if(!parsed.settings && !parsed.members && !parsed.protocol) throw new Error('Die Datei sieht nicht wie eine Köcheclub-Datensicherung aus.');

      lastStep='Migration vorbereiten';
      if(typeof window.migrateState === 'function') migrated=window.migrateState(parsed);
      else migrated=parsed;

      const summary=summarizeStateObject(migrated);
      if(dryRun){
        const ok=confirm(`Test-Rücksicherung erfolgreich geprüft.\n\nDatei: ${filename}\nMitglieder: ${summary.members ?? 'unbekannt'}\nEinstellungen: ${summary.settings ? 'vorhanden' : 'fehlen'}\n\nJetzt wirklich zurücksichern?`);
        if(!ok){
          safeLogBackup('Rücksicherung Test erfolgreich',`Datei: ${filename}, nicht übernommen`);
          safeLogAction('Datensicherung','Rücksicherung Test erfolgreich',`Datei: ${filename}, nicht übernommen`);
          safeToast('Test-Rücksicherung geprüft. Es wurde nichts geändert.','info');
          return;
        }
      } else {
        if(!confirm('Rücksicherung wirklich durchführen? Der aktuelle Datenbestand wird ersetzt.')) return;
      }

      lastStep='Datenbestand übernehmen';
      window.state=migrated;

      lastStep='Anzeige aktualisieren';
      const renderSteps=renderAfterRestore();

      const duration=((performance.now()-started)/1000).toFixed(1)+' s';
      safeLogAction('Datensicherung','Rücksicherung importiert',`${filename}, Dauer ${duration}`);
      safeLogBackup('Rücksicherung erfolgreich',`Datei: ${filename}, Mitglieder: ${summary.members ?? '-'}, Dauer: ${duration}`);
      safeToast('Rücksicherung erfolgreich durchgeführt.','success');
      console.info('Rücksicherung OK', {filename,summary,renderSteps});
    }catch(err){
      console.error(err);
      const diag=makeRestoreDiagnostic({
        result:'FEHLER',
        file:{name:filename,size:file?.size || 0,type:file?.type || ''},
        lastStep,
        error:{message:err.message,name:err.name,stack:err.stack},
        parsedSummary:parsed ? summarizeStateObject(parsed) : null,
        migratedSummary:migrated ? summarizeStateObject(migrated) : null,
        textPreview:String(text||'').slice(0,500)
      });
      const diagName=`KNG_Ruecksicherung_Fehler_${nowStamp()}.json`;
      try{ downloadJson(diagName,diag); }catch(downloadErr){ console.error('Fehlerdatei konnte nicht erzeugt werden',downloadErr); }
      safeLogBackup('Rücksicherung fehlgeschlagen',`${err.message} – Fehlerdatei: ${diagName}`);
      safeLogAction('Datensicherung','Rücksicherung fehlgeschlagen',`${err.message} – Fehlerdatei erzeugt`);
      safeToast('Rücksicherung fehlgeschlagen. Fehlerdatei wurde erzeugt.','error');
    }finally{
      const input=document.getElementById('importData');
      if(input) input.value='';
    }
  };

  document.addEventListener('DOMContentLoaded',ensureRestoreExtras);
  setTimeout(ensureRestoreExtras,800);
  setTimeout(ensureRestoreExtras,2000);
})();
