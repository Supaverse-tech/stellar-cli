/**
 * getPublic.js
 *
 * CLI command: stellar get-public
 * - Derives a Stellar public key from a secret key.
 * - If --secret is missing, prompts for it.
 * - Optional --public lets you compare the derived key with a given public key.
 *   In interactive mode a single prompt asks for the public key; leaving it blank skips the comparison.
 */

const { Keypair } = require('@stellar/stellar-sdk');
const inquirer    = require('inquirer');

module.exports = (program) => {
  program
    .command('get-public')
    .option('--secret <secret>', 'Stellar secret key')
    .option('--public <publicKey>', 'Public key to compare')
    .description('Derive the public key from a secret key')
    .action(async (options) => {
      let { secret, public: pub } = options;

      const questions = [];

      if (!secret) {
        questions.push({
          type   : 'password',
          name   : 'secret',
          message: '🔐 Enter the Stellar secret key:',
          mask   : '*',
          validate: (i) => i.startsWith('S') || 'Must start with S...'
        });
      }

      if (pub === undefined) {
        questions.push({
          type   : 'input',
          name   : 'public',
          message: '🔄 Public key to compare (leave blank to skip):',
          validate: (i) => !i || i.startsWith('G') || 'Must start with G...',
          filter : (i) => i.trim() || undefined
        });
      }

      const answers = await inquirer.prompt(questions);
      secret = secret || answers.secret;
      pub    = pub    || answers.public;

      try {
        const kp      = Keypair.fromSecret(secret);
        const derived = kp.publicKey();
        console.log('🔑 Public Key:', derived);

        if (pub) {
          const match = derived === pub;
          console.log(match ? '✅ Keys match' : '❌ Keys do not match');
          if (!match) process.exitCode = 1;
        }
      } catch {
        console.error('❌ Invalid secret key');
        process.exit(1);
      }
    });
};
