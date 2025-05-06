/**
 * getAccountInfo.js
 *
 * CLI command: stellar get-account-info
 * Retrieves detailed information about a Stellar account with optional JSON output and file saving.
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
    .command('get-account-info')
    .option('--account <address>',  'Public account address')
    .option('--network <network>',  'Network: public, testnet, or custom URL')
    .option('--get-transactions',   'Include last 5 transactions')
    .option('--json',               'Return raw JSON output')
    .option('--out [file]',         'Write JSON output to a file (use default name if omitted)')
    .description('Fetch detailed information about a Stellar account')
    .action(async (options) => {
      const questions = [];

      if (!options.account) {
        questions.push({
          type   : 'input',
          name   : 'account',
          message: '🔑 Enter the Stellar public account address:',
          validate: (i) => i.startsWith('G') || 'Must start with G...'
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

      if (options.getTransactions === undefined) {
        questions.push({
          type   : 'confirm',
          name   : 'getTransactions',
          message: '📄 Include last 5 transactions?',
          default: false
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
          message: '📝 Filename for JSON (leave blank for default name, "." to stdout):',
          when   : (p) => (options.json ?? p.json) === true,
          filter : (v) => {
            const t = v.trim();
            if (t === '.') return undefined;
            return t || true;
          }
        });
      }

      const a              = await inquirer.prompt(questions);
      const account        = options.account         ?? a.account;
      const network        = options.network         ?? a.network         ?? 'public';
      const getTx          = options.getTransactions ?? a.getTransactions ?? false;
      const wantJson       = options.json            ?? a.json           ?? false;
      const out            = options.out             ?? a.out;

      const serverUrl = HORIZON_URLS[network] || network;
      const server    = new Horizon.Server(serverUrl);

      try {
        const acc = await server.loadAccount(account);

        const result = {
          account      : acc.accountId(),
          sequence     : acc.sequence,
          subentryCount: acc.subentryCount,
          homeDomain   : acc.home_domain || null,
          balances     : acc.balances.map(b => ({
            asset  : b.asset_type === 'native' ? 'XLM' : `${b.asset_code}:${b.asset_issuer}`,
            balance: b.balance
          })),
          signers      : acc.signers,
          totalPayments: 0,
          transactions : []
        };

        const ops = await server.operations()
                                .forAccount(account)
                                .order('desc')
                                .limit(200)
                                .call();
        result.totalPayments = ops.records.filter(o => o.type === 'payment').length;

        if (getTx) {
          const txs = await server.transactions()
                                  .forAccount(account)
                                  .order('desc')
                                  .limit(5)
                                  .call();
          result.transactions = txs.records.map(tx => ({
            hash       : tx.hash,
            created_at : tx.created_at,
            fee_charged: tx.fee_charged,
            successful : tx.successful,
            memo       : tx.memo || null
          }));
        }

        if (wantJson) {
          const jsonOutput = JSON.stringify(result, null, 2);
          if (out) {
            const filename = typeof out === 'string'
              ? out
              : (() => {
                  const safe = result.account.slice(0, 4) + '...' + result.account.slice(-4);
                  const ts   = new Date().toISOString().replace(/:/g, '-');
                  return `account_${safe}_${ts}.json`;
                })();
            fs.writeFileSync(filename, jsonOutput);
            console.log(`✅ JSON saved to ${filename}`);
          } else {
            process.stdout.write(jsonOutput);
          }
          return;
        }

        console.log('👤 Account Info');
        console.log('-------------------');
        console.log('Account:       ', result.account);
        console.log('Sequence:      ', result.sequence);
        console.log('Subentry Count:', result.subentryCount);
        if (result.homeDomain) console.log('Home Domain:   ', result.homeDomain);
        console.log('-------------------');
        if (result.signers.length > 1 || result.signers[0]?.key !== result.account) {
          console.log('🔏 Signers:');
          result.signers.forEach(s => console.log(`  - ${s.key} (weight: ${s.weight})`));
          console.log('-------------------');
        }
        console.log('💰 Balances:');
        result.balances.forEach(b => console.log(`  - ${b.balance} ${b.asset}`));
        console.log('-------------------');
        console.log(`📤 Total payment operations: ${result.totalPayments}`);
        if (getTx && result.transactions.length) {
          console.log('-------------------');
          console.log('🧾 Last 5 Transactions:');
          result.transactions.forEach((tx, i) => {
            console.log(`  #${i + 1}:`);
            console.log(`    Hash:    ${tx.hash}`);
            console.log(`    Created: ${tx.created_at}`);
            console.log(`    Fee:     ${tx.fee_charged} stroops`);
            console.log(`    Success: ${tx.successful ? '✅' : '❌'}`);
            console.log(`    Memo:    ${tx.memo || '(none)'}`);
          });
        }
      } catch (err) {
        console.error('❌ Failed to fetch account info');
        console.error(err.response?.data?.detail || err.message);
        process.exit(1);
      }
    });
};

module.exports.interactive = async () => {
  const program = new (require('commander').Command)();
  require('./getAccountInfo')(program);
  await program.parseAsync(['node', 'get-account-info']);
};
