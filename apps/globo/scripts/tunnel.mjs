import { spawn } from 'node:child_process';
const domain='https://gustsantos.ngrok.io';
// Deliberately exposes only the Globo server. Existing tunnels are never stopped.
try{
 const r=await fetch('http://127.0.0.1:4040/api/tunnels',{signal:AbortSignal.timeout(1500)});
 if(r.ok){const b=await r.json();if(b.tunnels?.length){console.error('Há túneis ngrok ativos. Preserve-os e inicie Globo em outra sessão/configuração dedicada.');process.exit(1);}}
}catch{/* No active local agent. */}
const child=spawn('ngrok',['http','http://127.0.0.1:3007','--url',domain,'--inspect=false','--log=stdout','--log-format=json'],{stdio:['ignore','pipe','pipe']});
let reported=false;
const redact=(data)=>{const codes=String(data).match(/ERR_NGROK_\d+/g);if(codes)console.error('ngrok: '+[...new Set(codes)].join(', '));};
child.stdout.on('data',redact);child.stderr.on('data',redact);
child.on('error',()=>console.error('Não foi possível iniciar ngrok.'));
const timer=setInterval(async()=>{try{const r=await fetch('http://127.0.0.1:4040/api/tunnels',{signal:AbortSignal.timeout(1000)});if(!r.ok)return;const b=await r.json();const tunnel=b.tunnels?.find(t=>t.public_url===domain&&['http://127.0.0.1:3007','http://localhost:3007'].includes(t.config?.addr));if(tunnel&&!reported){reported=true;console.info('Túnel Globo conectado: '+domain+'/globo/ · painel exige autenticação');}}catch{/* Retry without logging raw responses. */}},1000);
child.on('exit',code=>{clearInterval(timer);if(!reported)console.error('Túnel não confirmado. Confira domínio reservado e autenticação ngrok no Console.');process.exitCode=code??1;});
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,()=>{clearInterval(timer);child.kill(sig);});
