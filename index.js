#!/usr/bin/env node

const { Command } = require('commander');
const program = new Command();
const inquirer = require('inquirer');

require('./commands/getPublic')(program);
require('./commands/getTransactionInfo')(program);
require('./commands/getAccountInfo')(program);
require('./commands/audit/trustlines')(program);

program.name('stellar').description('Stellar CLI').version('1.0.0');

program
  .command('interactive')
  .description('Start interactive CLI')
  .action(async () => {
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: '🚀 What do you want to do?',
        choices: [
          { name: '🔐 Derive public key from secret (get-public)', value: 'get-public' },
          { name: '📄 View account info (get-account-info)', value: 'get-account-info' },
          { name: '🔍 View transaction info (get-transaction-info)', value: 'get-transaction-info' },
          { name: '🔍 Audit trustlines (audit-trustlines)', value: 'audit-trustlines' },
          { name: '❌ Exit', value: 'exit' }
        ]
      }
    ]);

    if (action === 'exit') return;

    const childProcess = require('child_process');
    const args = [action];
    const bin = process.argv[1]; 
    childProcess.spawnSync('node', [bin, ...args], { stdio: 'inherit' });
  });


if (!process.argv.slice(2).length) {
  program.parse(['node', 'stellar', 'interactive']);
} else {
  program.parse(process.argv);
}
