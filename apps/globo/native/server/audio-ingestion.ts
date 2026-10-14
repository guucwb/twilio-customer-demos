// Candidate supported TEXT Communication contract. Not executed automatically:
// WhatsApp delivery/capture behavior must be validated on an authorized resource.
export function voiceNoteCommunication(c:{messageSid:string;mediaSid:string;transcript:string;from:string;to:string;sha256:string}){
 if(!/^(?:SM|MM)[0-9a-f]{32}$/i.test(c.messageSid)||!/^ME[0-9a-f]{32}$/i.test(c.mediaSid)||!/^whatsapp:\+\d{8,15}$/.test(c.from)||!/^whatsapp:\+\d{8,15}$/.test(c.to)||!c.transcript.trim()||c.transcript.length>2000||! /^[0-9a-f]{64}$/.test(c.sha256))throw new Error('invalid-audio-provenance');
 return {communication:{channelId:c.messageSid,author:{address:c.from,channel:'WHATSAPP'},content:{type:'TEXT',text:c.transcript},resourceId:c.messageSid+':audio-transcription',recipients:[{address:c.to,channel:'WHATSAPP'}]},localProvenance:{messageSid:c.messageSid,mediaSid:c.mediaSid,mediaSHA256:c.sha256,transcriptionSource:'OpenAI Audio Transcriptions',nativeIngestionValidated:false}};
}
