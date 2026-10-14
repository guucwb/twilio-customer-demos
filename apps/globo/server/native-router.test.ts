import {it,expect} from 'vitest';
import {createServer,request as httpRequest} from 'node:http';
import {once} from 'node:events';
import WebSocket,{WebSocketServer} from 'ws';
import {nativeRoute,forwardNative,upgradeNative} from './native-router';
it('dispatches only exact native namespaces and preserves all other consumers',()=>{
 expect(nativeRoute('/globo/native/voice')).toBe(true);expect(nativeRoute('/api/globo/native/state')).toBe(true);
 for(const p of ['/globo/voice','/voice/calllink/inbound','/voice/marisa/inbound','/voice/bourbon/inbound','/webhooks/twilio/message','/globo/native-other'])expect(nativeRoute(p)).toBe(false);
});
it('preserves public signature, URL, body and Host through HTTP proxy',async()=>{
 const peer=createServer(async(req,res)=>{let body='';for await(const chunk of req)body+=chunk;res.end(JSON.stringify({url:req.url,host:req.headers.host,signature:req.headers['x-twilio-signature'],body}));});peer.listen(0,'127.0.0.1');await once(peer,'listening');
 const gateway=createServer((req,res)=>forwardNative(req,res,(peer.address() as {port:number}).port));gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 try{const body=await new Promise<string>((resolve,reject)=>{const req=httpRequest({hostname:'127.0.0.1',port:(gateway.address() as {port:number}).port,path:'/globo/native/voice?fixture=1',method:'POST',headers:{Host:'demo.example.com','X-Twilio-Signature':'fixture-signature'}},res=>{let data='';res.on('data',v=>{data+=v;});res.on('end',()=>resolve(data));});req.on('error',reject);req.end('CallSid=fixture');});expect(JSON.parse(body)).toEqual({url:'/globo/native/voice?fixture=1',host:'demo.example.com',signature:'fixture-signature',body:'CallSid=fixture'});}finally{gateway.closeAllConnections();peer.closeAllConnections();await Promise.all([new Promise<void>(r=>gateway.close(()=>r())),new Promise<void>(r=>peer.close(()=>r()))]);}
});
it('preserves the signed WebSocket upgrade and bidirectional relay',async()=>{
 const peer=createServer();const wss=new WebSocketServer({server:peer});let signature:string|undefined;
 wss.on('connection',(ws,req)=>{signature=req.headers['x-twilio-signature'] as string;ws.on('message',data=>ws.send(data));});peer.listen(0,'127.0.0.1');await once(peer,'listening');
 const gateway=createServer();gateway.on('upgrade',(req,socket,head)=>upgradeNative(req,socket,head,(peer.address() as {port:number}).port));gateway.listen(0,'127.0.0.1');await once(gateway,'listening');
 const ws=new WebSocket(`ws://127.0.0.1:${(gateway.address() as {port:number}).port}/globo/native/relay`,{headers:{'X-Twilio-Signature':'fixture-signature'}});
 try{await once(ws,'open');ws.send('fixture-token');const [data]=await once(ws,'message');expect(data.toString()).toBe('fixture-token');expect(signature).toBe('fixture-signature');}finally{ws.terminate();for(const c of wss.clients)c.terminate();wss.close();gateway.close();peer.close();}
});
