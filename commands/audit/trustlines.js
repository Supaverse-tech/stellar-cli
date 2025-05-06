/**
 * auditTrustlines.js
 *
 * CLI command: stellar audit-trustlines
 * - Lists and audits all non-native asset trustlines for a Stellar account.
 * - Marks trustlines with zero balance.
 */

const { Horizon } = require('@stellar/stellar-sdk');
const fs          = require('fs');
const inquirer    = require('inquirer');

const HORIZON_URLS = {
  public : 'https://horizon.stellar.org',
  testnet: 'https://horizon-testnet.stellar.org'
};

module.exports = (program) => {
  program
    .command('audit-trustlines')
    .option('--account <address>', 'Public account address')
    .option('--network <network>', 'Network: public, testnet, or custom URL')
    .option('--json',               'Return raw JSON output')
    .option('--out [file]',         'Write JSON output to a file')
    .description('Audit asset trustlines for a Stellar account')
    .action(async (options) => {
      const questions = [];

      if (!options.account) {
        questions.push({
          type   : 'input',
          name   : 'account',
          message: '🔑 Enter the Stellar public account address:',
          validate: i => i.startsWith('G') || 'Must start with G...'
        });
      }

      if (!options.network) {
        questions.push({
          type   : 'list',
          name   : 'network',
          message: '🌐 Choose the network:',
          choices: ['public', 'testnet'],
          default: 'public'
        });
      }

      if (options.json === undefined) {
        questions.push({
          type   : 'confirm',
          name   : 'json',
          message: '💾 Output as JSON? (default no)',
          default: false
        });
      }

      if (options.out === undefined) {
        questions.push({
          type   : 'input',
          name   : 'out',
          message: '📝 Filename for JSON (leave blank for default, "." to stdout):',
          when   : p => (options.json ?? p.json) === true,
          filter : v => {
            const t = v.trim();
            if (t === '.') return undefined;
            return t || true;
          }
        });
      }

      const answers = await inquirer.prompt(questions);
      const account = options.account      ?? answers.account;
      const network = options.network      ?? answers.network  ?? 'public';
      const wantJson= options.json         ?? answers.json     ?? false;
      const out     = options.out          ?? answers.out;

      const serverUrl = HORIZON_URLS[network] || network;
      const server    = new Horizon.Server(serverUrl);

      try {
        const acc = await server.loadAccount(account);
        const trustlines = acc.balances
          .filter(b => b.asset_type !== 'native')
          .map(b => ({
            asset : `${b.asset_code}:${b.asset_issuer}`,
            balance: b.balance,
            limit : b.limit,
            zero  : parseFloat(b.balance) === 0
          }));

        const result = { account, network, trustlines };

        if (wantJson) {
          const jsonOut = JSON.stringify(result, null, 2);
          if (out) {
            const filename = typeof out === 'string'
              ? out
              : `trustlines_${account.slice(0,4)}_${new Date().toISOString().replace(/:/g,'-')}.json`;
            fs.writeFileSync(filename, jsonOut);
            console.log(`✅ JSON saved to ${filename}`);
          } else {
            process.stdout.write(jsonOut);
          }
          return;
        }

        console.log('🔍 Trustlines Audit');
        console.log('-------------------');
        if (trustlines.length === 0) {
          console.log('No non-native trustlines found.');
        } else {
          trustlines.forEach((t, i) => {
            const mark = t.zero ? ' ⚠ zero balance' : '';
            console.log(`#${i+1}: Asset: ${t.asset}${mark}`);
            console.log(`    Balance: ${t.balance}`);
            console.log(`    Limit:   ${t.limit}`);
          });
        }
      } catch (err) {
        console.error('❌ Failed to audit trustlines');
        console.error(err.response?.data?.detail || err.message);
        process.exit(1);
      }
    });
};
