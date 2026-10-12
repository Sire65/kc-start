/* Einmalige, eng begrenzte Datenpflege für bekannte Mitgliedskarten. */
(function(){
  'use strict';
  const FLAG='knownMemberCards20260902';
  const AREA_FLAG='memberAreaAssignments20260902';
  const AREA_RECOVERY_FLAG='memberAreaRecovery20260902';
  const PROFESSION_RECOVERY_FLAG='knownProfessionsRecovery20260902';
  const KOCH_PHOTO_RECOVERY_FLAG='kochPhotoRecovery20260902';
  const KOCH_CLOTHING_RECOVERY_FLAG='kochClothingRecovery20260902';
  const AREA_ASSIGNMENTS={
    m_kc_0001:['Service (Vorne)','Nachschub (Hinten)','Vorbereitung','Wartung','Planung','Innovation'],
    m_kc_0002:['Nachschub (Hinten)','Vorbereitung','Planung'],
    m_kc_0003:['Service (Vorne)','Finanzen','Wartung','Admin','Technik','Innovation'],
    m_kc_0005:['Nachschub (Hinten)','Vorbereitung','Wartung','Planung','Innovation'],
    m_kc_0006:['Nachschub (Hinten)','Vorbereitung','Wartung','Planung','Innovation'],
    m_kc_0007:['Service (Vorne)','Nachschub (Hinten)','Vorbereitung','Innovation'],
    m_kc_0008:['Vorbereitung','Finanzen'],
    m_kc_0009:['Service (Vorne)','Nachschub (Hinten)','Vorbereitung','Finanzen','Planung','Admin'],
    m_kc_0010:['Service (Vorne)','Nachschub (Hinten)','Vorbereitung','Planung','Technik','Innovation'],
    m_kc_0011:['Service (Vorne)','Nachschub (Hinten)','Vorbereitung','Wartung'],
    m_kc_0012:[],
    m_kc_0013:['Nachschub (Hinten)','Vorbereitung','Wartung'],
    m_kc_0015:['Nachschub (Hinten)','Vorbereitung','Wartung','Planung'],
    m_kc_0016:[],
    m_kc_0017:['Service (Vorne)','Innovation']
  };
  const UPDATES={};
  const ADDRESS_FIX_FLAG='reinkoberZanderAddressFix20260902';
  function applyAddressCorrection(){
    if(state.dataMigrations[ADDRESS_FIX_FLAG])return false;
    const fixes={};
    Object.entries(fixes).forEach(([id,value])=>{
      const member=state.members.find(m=>String(m.id||'')===id);if(member)Object.assign(member,value);
      const address=Array.isArray(state.addresses)?state.addresses.find(a=>String(a.sourceMemberId||'')===id):null;
      if(address)Object.assign(address,{street:value.street,zip:value.postalCode,city:value.city});
    });
    state.dataMigrations[ADDRESS_FIX_FLAG]=true;
    return true;
  }
  function apply(){
    if(!window.state||!Array.isArray(state.members))return false;
    state.dataMigrations=(state.dataMigrations&&typeof state.dataMigrations==='object')?state.dataMigrations:{};
    const updateCards=!state.dataMigrations[FLAG];
    const updateAreas=!state.dataMigrations[AREA_FLAG];
    const recoverAreas=!state.dataMigrations[AREA_RECOVERY_FLAG];
    const correctedAddresses=applyAddressCorrection();
    const recoverProfessions=false; /* Historische Berufs-Recovery deaktiviert: manuelle Stammdaten sind autoritativ. */
    const recoverKochPhoto=!state.dataMigrations[KOCH_PHOTO_RECOVERY_FLAG];
    const recoverKochClothing=!state.dataMigrations[KOCH_CLOTHING_RECOVERY_FLAG];
    if(!updateCards&&!updateAreas&&!recoverAreas&&!correctedAddresses&&!recoverProfessions&&!recoverKochPhoto&&!recoverKochClothing)return true;
    let changed=correctedAddresses?1:0;
    if(!state.dataMigrations[PROFESSION_RECOVERY_FLAG]) state.dataMigrations[PROFESSION_RECOVERY_FLAG]=true;
    if(recoverKochPhoto){
      const koch=state.members.find(m=>String(m.id||'')==='m_kc_0010');
      if(koch&&!String(koch.photoData||koch.photo||'').trim()){koch.photoData='Zusatz/Passbild Herr Koch_2.jpg';changed++;}
      state.dataMigrations[KOCH_PHOTO_RECOVERY_FLAG]=true;
    }
    if(recoverKochClothing){
      const koch=state.members.find(m=>String(m.id||'')==='m_kc_0010');
      if(koch){koch.clothing={...(koch.clothing||{}),jacketSize:'62 / 3XL',poloSize:'62 / 3XL',pantsSize:'62',shoeSize:'41'};changed++;}
      state.dataMigrations[KOCH_CLOTHING_RECOVERY_FLAG]=true;
    }
    if(updateCards)Object.entries(UPDATES).forEach(([id,values])=>{
      const member=state.members.find(m=>String(m.id||'')===id);
      if(!member)return;
      Object.entries(values).forEach(([key,value])=>{if(!String(member[key]??'').trim())member[key]=value;});
      member.history=Array.isArray(member.history)?member.history:[];
      if(!member.history.some(h=>String(h?.text||'').includes('Ausweisdaten am 02.09.2026 geprüft'))) member.history.unshift({date:'2026-09-02',type:'Datenpflege',text:'Ausweisdaten am 02.09.2026 geprüft; relevante Mitgliedsdaten aktualisiert.'});
      const address=Array.isArray(state.addresses)?state.addresses.find(a=>String(a.sourceMemberId||'')===id):null;
      if(address){const addressValues={firstName:member.firstName,lastName:member.lastName,street:member.street,zip:member.postalCode,city:member.city};Object.entries(addressValues).forEach(([key,value])=>{if(!String(address[key]??'').trim())address[key]=value;});}
      changed++;
    });
    if(recoverAreas){
      Object.entries(AREA_ASSIGNMENTS).forEach(([id,areas])=>{const member=state.members.find(m=>String(m.id||'')===id);if(member&&areas.length&&(!Array.isArray(member.committees)||member.committees.length===0)){member.committees=[...areas];changed++;}});
      state.dataMigrations[AREA_RECOVERY_FLAG]=true;
    }
    if(updateAreas){
      Object.entries(AREA_ASSIGNMENTS).forEach(([id,areas])=>{const member=state.members.find(m=>String(m.id||'')===id);if(member&&(!Array.isArray(member.committees)||member.committees.length===0)){member.committees=[...areas];changed++;}});
      state.dataMigrations[AREA_FLAG]=true;
    }
    if(!changed)return false;
    if(updateCards)state.dataMigrations[FLAG]=true;
    if(typeof saveState==='function')saveState();
    if(typeof renderAll==='function')renderAll();
    if(window.KNGCloudSync?.queueSnapshot)window.KNGCloudSync.queueSnapshot(state).catch(()=>{});
    return true;
  }
  function start(){if(apply())return;let tries=0;const timer=setInterval(()=>{tries++;if(apply()||tries>=40)clearInterval(timer);},250);}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',start,{once:true}):start();
})();
