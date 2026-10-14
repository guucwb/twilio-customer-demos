import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
// Optional public CA exported from the Mac's existing administrative trust store.
// Scoped to this child; never disables TLS verification or changes global trust.
const ca=root+'.demo-data/macos-trusted-ca.pem';
const env={...process.env};if(!env.NODE_EXTRA_CA_CERTS&&existsSync(ca))env.NODE_EXTRA_CA_CERTS=ca;
const child=spawn(process.execPath,['--import','tsx','native/server/index.ts'],{cwd:root,env,stdio:'inherit'});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('exit',code=>{process.exitCode=code??1;});
