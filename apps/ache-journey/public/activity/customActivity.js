/* global Postmonger */
(() => {
 const form=document.getElementById('config');const status=document.getElementById('status');
 const session=new Postmonger.Session();let activity=null;
 const fields=['sender','contentSid','phone','contactKey','variables','attributes','errorBehavior'];
 function populate(data){for(const key of fields)if(data[key]!==undefined)form.elements.namedItem(key).value=typeof data[key]==='object'?JSON.stringify(data[key]):data[key];}
 try{const cached=JSON.parse(localStorage.getItem('ache-journey-activity')||'null');if(cached)populate(cached);}catch{/* Local storage may be unavailable inside tenant iframe. */}
 function read(){if(!form.reportValidity())throw new Error('Preencha os campos obrigatórios.');const data={};for(const key of fields)data[key]=form.elements.namedItem(key).value;
 for(const key of ['variables','attributes']){data[key]=JSON.parse(data[key]);if(!data[key]||Array.isArray(data[key])||typeof data[key]!=='object'||Object.values(data[key]).some(v=>typeof v!=='string'))throw new Error('JSON deve conter um objeto de strings.');}
 if(Object.keys(data.variables).some(k=>!/^\d+$/.test(k)))throw new Error('Variáveis devem usar índices numéricos.');return data;}
 function save(){try{const data=read();if(activity){activity.arguments=activity.arguments||{};activity.arguments.execute=activity.arguments.execute||{};activity.arguments.execute.inArguments=[data];activity.metaData=activity.metaData||{};activity.metaData.isConfigured=true;session.trigger('updateActivity',activity);status.textContent='Configuração enviada ao Journey Builder.';}else{try{localStorage.setItem('ache-journey-activity',JSON.stringify(data));}catch{/* Configuration still passed to local host. */}status.textContent='Configuração salva localmente. Registro no tenant ainda não validado.';window.parent.postMessage({type:'ache-journey-config',settings:data},window.location.origin);}}catch(error){status.textContent=error.message;session.trigger('ready');}}
 session.on('initActivity',payload=>{activity=payload;populate(Object.assign({},...(payload.arguments?.execute?.inArguments||[])));session.trigger('updateButton',{button:'next',text:'done',enabled:true});});
 session.on('clickedNext',save);session.on('clickedBack',()=>session.trigger('prevStep'));session.on('gotoStep',()=>session.trigger('ready'));
 form.addEventListener('submit',event=>{event.preventDefault();save();});document.getElementById('reset').addEventListener('click',()=>{form.reset();save();try{localStorage.removeItem('ache-journey-activity');}catch{/* Storage optional. */}status.textContent='Exemplo restaurado.';});
 session.trigger('ready');
})();
