import {request as httpRequest,type IncomingMessage,type ServerResponse} from 'node:http';
import type {Duplex} from 'node:stream';
export const nativeRoute=(url:string)=>/^\/(?:globo\/native|api\/globo\/native)(?:\/|\?|$)/.test(url);
export function forwardNative(req:IncomingMessage,res:ServerResponse,port=3010){
 const upstream=httpRequest({host:'127.0.0.1',port,path:req.url,method:req.method,headers:req.headers,timeout:15000},reply=>{res.writeHead(reply.statusCode??502,reply.headers);reply.pipe(res);});
 upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end();});req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
}
export function upgradeNative(req:IncomingMessage,socket:Duplex,head:Buffer,port=3010){
 const upstream=httpRequest({host:'127.0.0.1',port,path:req.url,method:'GET',headers:req.headers,timeout:10000});
 upstream.on('upgrade',(reply,peer,peerHead)=>{
  const headers=reply.rawHeaders.reduce((s,v,i)=>i%2?s+v+'\r\n':s+v+': ','');socket.write('HTTP/1.1 101 Switching Protocols\r\n'+headers+'\r\n');
  if(head.length)peer.write(head);if(peerHead.length)socket.write(peerHead);socket.pipe(peer).pipe(socket);
  socket.on('error',()=>peer.destroy());peer.on('error',()=>socket.destroy());socket.on('close',()=>peer.destroy());
 });
 upstream.on('response',reply=>{socket.end(`HTTP/1.1 ${reply.statusCode??503} Rejected\r\nConnection: close\r\n\r\n`);reply.resume();});
 upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());upstream.end();
}
