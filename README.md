# @supaverse/stellar-cli

Stellar CLI for querying and auditing Stellar accounts and transactions.

## Installation

Install globally via npm:

```bash
npm install -g @supaverse/stellar-cli
```

## Usage

```bash
stellar <command> [options]
```

You can also start in interactive mode:

```bash
stellar interactive
```

---

## Commands

### `get-public`

Derive a Stellar public key from a secret key, and optionally compare it.

```bash
stellar get-public [--secret <SEED>] [--public <PUBLIC_KEY>]
```

- `--secret <secret>`  
  Your Stellar secret key. If omitted, you will be prompted (input hidden).
- `--public <publicKey>`  
  Optional. A public key to compare against. If provided (or entered at the prompt), CLI reports whether the derived key matches (`✅ Keys match`) or not (`❌ Keys do not match`).

**Example:**

```bash
stellar get-public --secret SABC...XYZ --public GABC...123
```

---

### `get-account-info`

Fetch detailed information about a Stellar account.

```bash
stellar get-account-info [--account <ADDRESS>]
                         [--network <public|testnet|URL>]
                         [--get-transactions]
                         [--json]
                         [--out [FILE]]
```

- `--account <address>`  
  The account’s public key. If omitted, you will be prompted.
- `--network <network>`  
  `public`, `testnet` or a custom Horizon URL. Defaults to `public`.
- `--get-transactions`  
  Include the last 5 transactions in the output.
- `--json`  
  Output raw JSON instead of formatted text. Default is text.
- `--out [file]`  
  Save JSON to a file.  
  - If you pass `--out` without a filename or leave the prompt blank, a default name is used:  
    `account_<first4>...<last4>_YYYY-MM-DDTHH-MM-SS.json`.  
  - Enter `.` to force JSON to stdout.

**Example:**

```bash
stellar get-account-info --account GABC...1234 --get-transactions --json
```

---

### `get-transaction-info`

Retrieve detailed information about a Stellar transaction.

```bash
stellar get-transaction-info --transaction <HASH>
                             [--network <public|testnet|URL>]
                             [--json]
                             [--out [FILE]]
```

- `--transaction <hash>`  
  The 64-character transaction hash. If omitted, you will be prompted.
- `--network <network>`  
  `public`, `testnet` or a custom Horizon URL. Defaults to `public`.
- `--json` / `--out`  
  Behave like in `get-account-info`.

**Example:**

```bash
stellar get-transaction-info --transaction e3f...9a2 --json
```

---

### `audit-trustlines`

Audit all non-native asset trustlines for an account, marking zero balances.

```bash
stellar audit-trustlines [--account <ADDRESS>]
                         [--network <public|testnet|URL>]
                         [--json]
                         [--out [FILE]]
```

- `--account <address>`  
  The account’s public key. If omitted, you will be prompted.
- `--network` / `--json` / `--out`  
  Same behavior as in previous commands.

**Text output example:**

```
🔍 Trustlines Audit
-------------------
#1: Asset: USDC:GDUK... ⚠ zero balance
    Balance: 0
    Limit:   1000
#2: Asset: EURT:GAP5...
    Balance: 50
    Limit:   100
```

---

### `interactive`

Start interactive CLI mode. Presents a menu to choose any of the above commands:

```bash
stellar interactive
```

## License

ISC © Supaverse  
