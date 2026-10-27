// Official pinned Stripe CLI. Keep both API key and listener signing secret out of terminal output.
import {readFile,writeFile,chmod,mkdir} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {spawn} from 'node:child_process';
const root=new URL('../../',import.meta.url),file=new URL('.env.stripe-test.local',root);
let child,buffer='',saved=false;
try{
  const env=parseEnv(await readFile(file,'utf8'));
  if(!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY??''))throw new Error('Test key required');
  await mkdir(new URL('.verification-results/',root),{recursive:true});
  child=spawn('npm',['exec','--yes','--package=@stripe/cli@1.55.2','--','stripe','listen','--skip-update','--events-from','@self','--events','checkout.session.completed,checkout.session.expired','--forward-to','http://127.0.0.1:4891/api/v1/payments/stripe/webhook','--device-name','almina-local-stripe-test','--config',new URL('.verification-results/stripe-cli.toml',root).pathname],{
    detached:true,stdio:['ignore','pipe','pipe'],env:Object.fromEntries(Object.entries({PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,STRIPE_API_KEY:env.STRIPE_SECRET_KEY,NO_COLOR:'1'}).filter(([,value])=>value!==undefined)),
  });
  let savePromise=Promise.resolve();
  const capture=chunk=>{
    buffer=(buffer+chunk.toString()).slice(-12000);
    const match=buffer.match(/whsec_[A-Za-z0-9]+(?=[\s)])/);
    if(match&&!saved){
      saved=true;
      savePromise=(async()=>{
        const text=await readFile(file,'utf8'),line='STRIPE_WEBHOOK_SECRET='+match[0];
        await writeFile(file,/^STRIPE_WEBHOOK_SECRET=.*$/m.test(text)?text.replace(/^STRIPE_WEBHOOK_SECRET=.*$/m,line):text+'\n'+line+'\n',{mode:0o600});await chmod(file,0o600);
        console.log('Stripe TEST listener ready. Signing secret saved privately in .env.stripe-test.local.');
        console.log('Forwarding only Checkout completed/expired events to loopback port 4891.');
      })().catch(()=>{console.error('Could not save Stripe listener signing secret.');process.exitCode=1;stop();});
    }
    for(const status of chunk.toString().matchAll(/\[(\d{3})\]\s+POST/g))console.log('Stripe test webhook delivery HTTP '+status[1]);
  };
  child.stdout.on('data',capture);child.stderr.on('data',capture);
  child.on('error',()=>{console.error('Stripe CLI could not start.');process.exitCode=1;});
  child.on('exit',code=>{void savePromise.then(()=>{if(code&&code!==143)process.exitCode=1;if(!saved)console.error('Stripe listener did not become ready. Check the sandbox API key and network.');});});
}catch{console.error('Stripe listener requires a test secret key in .env.stripe-test.local.');process.exitCode=1;}
function stop(){if(child?.pid){try{process.kill(-child.pid,'SIGTERM');}catch{/* Already stopped. */}}}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,stop);
