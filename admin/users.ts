// Manage admin logins.
//
//   npm run admin:user -- add <name> <password>
//   npm run admin:user -- remove <name>
//   npm run admin:user -- list
import { loadConfig, saveConfig, hashPassword } from './config.ts';

const [cmd, name, password] = process.argv.slice(2);
const config = loadConfig();

if (cmd === 'add' && name && password) {
  // The admin can be reached from the internet (Cloudflare Tunnel), so passwords must be long.
  if (password.length < 12) { console.error('Use a password of at least 12 characters.'); process.exit(1); }
  config.users = config.users.filter((u) => u.name.toLowerCase() !== name.toLowerCase());
  config.users.push({ name, ...hashPassword(password) });
  saveConfig(config);
  console.log(`Saved login for ${name}.`);
} else if (cmd === 'remove' && name) {
  const before = config.users.length;
  config.users = config.users.filter((u) => u.name.toLowerCase() !== name.toLowerCase());
  saveConfig(config);
  console.log(before === config.users.length ? `No user called ${name}.` : `Removed ${name}.`);
} else if (cmd === 'list') {
  console.log(config.users.map((u) => u.name).join('\n') || '(no users yet)');
} else {
  console.log('Usage:\n  npm run admin:user -- add <name> <password>\n  npm run admin:user -- remove <name>\n  npm run admin:user -- list');
  process.exit(1);
}
