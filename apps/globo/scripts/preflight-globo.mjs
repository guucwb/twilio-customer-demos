import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const env={...process.env};
// Existing administrative CA, scoped only to the preflight child. TLS stays on.
const ca=root+'.demo-data/macos-trusted-ca.pem';if(!env.NODE_EXTRA_CA_CERTS&&existsSync(ca))env.NODE_EXTRA_CA_CERTS=ca;
const child=spawn(process.execPath,['--import','tsx','scripts/preflight-globo.ts',...process.argv.slice(2)],{cwd:root,env,stdio:'inherit'});
child.on('error',()=>{console.error('RESULTADO: BLOQUEADO · executor local indisponível.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
