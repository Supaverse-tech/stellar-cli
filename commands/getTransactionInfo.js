/**
 * getTransactionInfo.js
 *
 * CLI command: stellar get-transaction-info
 * - Fetches detailed info for a Stellar transaction.
 * - Interactive prompts cover missing flags (--transaction, --network, --json, --out).
 * - Network defaults to “public” if none is selected.
 * - JSON output can be printed or saved; blank filename triggers a default name.
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
    .command('get-transaction-info')
    .option('--transaction <hash>', 'Transaction hash to fetch')
    .option('--network <network>',  'Network: public, testnet, or custom URL')
    .option('--json',               'Return raw JSON output')
    .option('--out [file]',         'Write JSON output to a file (default name if omitted)')
    .description('Fetch detailed information about a Stellar transaction')
    .action(async (options) => {
      const questions = [];

      if (!options.transaction) {
        questions.push({
          type   : 'input',
          name   : 'transaction',
          message: '🔍 Enter the transaction hash:',
          validate: (i) => i.length === 64 || 'Must be a 64-char hash'
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
          message: '📝 Filename for JSON (leave blank for default name, "." to stdout):',
          when   : (p) => (options.json ?? p.json) === true,
          filter : (v) => {
            const t = v.trim();
            if (t === '.') return undefined;
            return t || true;            // '' → true
          }
        });
      }

      const ans       = await inquirer.prompt(questions);
      const hash      = options.transaction ?? ans.transaction;
      const network   = options.network     ?? ans.network     ?? 'public';
      const wantJson  = options.json        ?? ans.json        ?? false;
      const out       = options.out         ?? ans.out;

      const serverUrl = HORIZON_URLS[network] || network;
      const server    = new Horizon.Server(serverUrl);

      try {
        const tx  = await server.transactions().transaction(hash).call();
        const ops = await server.operations().forTransaction(hash).call();

        const result = {
          hash        : tx.hash,
          ledger      : tx.ledger,
          created_at  : tx.created_at,
          source_account: tx.source_account,
          fee_charged : tx.fee_charged,
          memo        : tx.memo || null,
          successful  : tx.successful,
          operation_count: tx.operation_count,
          operations  : ops.records.map((op) => {
            const base = { type: op.type, source: op.source_account || tx.source_account };
            switch (op.type) {
              case 'payment':
                return { ...base, to: op.to, amount: op.amount,
                  asset: op.asset_type === 'native' ? 'XLM' : `${op.asset_code}:${op.asset_issuer}` };
              case 'create_account':
                return { ...base, new_account: op.account, starting_balance: op.starting_balance };
              case 'change_trust':
                return { ...base, asset: op.asset_type === 'native' ? 'XLM' :
                  `${op.asset_code}:${op.asset_issuer}`, limit: op.limit };
              case 'allow_trust':
                return { ...base, trustor: op.trustor, asset: op.asset_type === 'native' ? 'XLM' :
                  `${op.asset_code}:${op.asset_issuer}`, authorize: op.authorize };
              case 'set_options':
                return { ...base, home_domain: op.home_domain, inflation_dest: op.inflation_dest,
                  signer_key: op.signer_key, signer_weight: op.signer_weight, master_key_weight: op.master_key_weight };
              case 'manage_data':
                return { ...base, name: op.name,
                  value: op.value !== null ? Buffer.from(op.value, 'base64').toString() : 'DELETED' };
              case 'path_payment_strict_send':
              case 'path_payment_strict_receive':
                return { ...base, to: op.to, amount: op.amount, source_max: op.source_max,
                  asset: op.asset_type === 'native' ? 'XLM' : `${op.asset_code}:${op.asset_issuer}` };
              case 'account_merge':
                return { ...base, into: op.into };
              default:
                return { ...base, raw: op };
            }
          })
        };

        if (wantJson) {
          const jsonOutput = JSON.stringify(result, null, 2);
          if (out) {
            const filename = typeof out === 'string'
              ? out
              : `transaction_${result.hash.slice(0, 6)}_${new Date().toISOString().replace(/:/g, '-')}.json`;
            fs.writeFileSync(filename, jsonOutput);
            console.log(`✅ JSON saved to ${filename}`);
          } else {
            process.stdout.write(jsonOutput);
          }
          return;
        }

        console.log('🔍 Transaction Info');
        console.log('-------------------');
        console.log('Hash:        ', result.hash);
        console.log('Ledger:      ', result.ledger);
        console.log('Created At:  ', result.created_at);
        console.log('Source:      ', result.source_account);
        console.log('Fee:         ', result.fee_charged, 'stroops');
        console.log('Memo:        ', result.memo || '(none)');
        console.log('Status:      ', result.successful ? '✅ Success' : '❌ Failed');
        console.log('Operations:  ', result.operation_count);
        console.log('-------------------');
        result.operations.forEach((op, i) => {
          console.log(`  #${i + 1}: [${op.type}]`);
          console.log(`      From: ${op.source}`);
          Object.entries(op).forEach(([k, v]) => {
            if (!['type', 'source'].includes(k)) console.log(`      ${capitalize(k)}: ${v}`);
          });
        });

      } catch (err) {
        console.error('❌ Failed to fetch transaction info');
        console.error(err.response?.data?.detail || err.message);
        process.exit(1);
      }
    });
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
}
