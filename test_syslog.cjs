const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const tokenMatch = env.match(/VITE_PROXMOX_TOKEN_ID=(.*?)(?:\r?\n|$)/);
const secretMatch = env.match(/VITE_PROXMOX_SECRET=(.*?)(?:\r?\n|$)/);
const nodeMatch = env.match(/VITE_PROXMOX_NODE=(.*?)(?:\r?\n|$)/);
const urlMatch = env.match(/VITE_PROXMOX_URL=(.*?)(?:\r?\n|$)/);

if (tokenMatch && secretMatch && urlMatch) {
  const token = tokenMatch[1].trim();
  const secret = secretMatch[1].trim();
  const node = nodeMatch ? nodeMatch[1].trim() : 'pve';
  let url = urlMatch[1].trim();
  
  if (url.endsWith('/')) url = url.slice(0, -1);
  
  console.log("Testing /syslog without start...");
  fetch(url + '/nodes/' + node + '/syslog?limit=2', {
    headers: { 'Authorization': 'PVEAPIToken=' + token + '=' + secret }
  })
  .then(r => r.json())
  .then(d => console.log('syslog limit=2 =>', JSON.stringify(d)))
  .catch(console.error);

  console.log("Testing /journal...");
  fetch(url + '/nodes/' + node + '/journal?lastentries=2', {
    headers: { 'Authorization': 'PVEAPIToken=' + token + '=' + secret }
  })
  .then(r => r.json())
  .then(d => console.log('journal =>', JSON.stringify(d)))
  .catch(console.error);
}
