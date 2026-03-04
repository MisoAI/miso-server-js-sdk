# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Miso JavaScript SDK for Node.js - a server-side SDK for interacting with [Miso's](https://miso.ai/) APIs. Provides both programmatic JavaScript API and CLI tools for search, recommendations, and data upload operations with Node.js stream support.

## Commands

### Install dependencies
```bash
npm install
```

### Run all tests
```bash
npm test
```

### Run tests for a specific package
```bash
npm run test -w packages/server-commons
```

### Run a single test file (using uvu)
```bash
cd packages/server-commons && npx uvu test channel.test.js
```

### Set version for release
```bash
npm run version <version>   # e.g., npm run version 1.2.3
```

## Architecture

This is an npm workspaces monorepo with the following packages:

### Core Packages
- **server-sdk** (`@miso.ai/server-sdk`) - Main SDK with `MisoClient` class and CLI (`miso` command). Entry point for most users.
- **server-commons** (`@miso.ai/server-commons`) - Shared utilities: streams, channels, rate limiting, task queues, configuration parsing. Used by all other packages.

### Data Source Packages
- **server-data** (`@miso.ai/server-data`) - CSV/XML/ZIP data processing tools (`miso-csv` CLI)
- **server-feed** (`@miso.ai/server-feed`) - RSS/Atom feed parsing (`miso-feed` CLI)
- **server-shopify** (`@miso.ai/server-shopify`) - Shopify API integration (`miso-shopify` CLI)
- **server-wordpress** (`@miso.ai/server-wordpress`) - WordPress API integration (`miso-wordpress`/`miso-wp` CLI)
- **server-jobs** (`@miso.ai/server-jobs`) - Job management tools (`miso-jobs` CLI)

### Key Patterns

**MisoClient** (`packages/server-sdk/src/client.js`): Main entry point. Accepts API key via constructor options or `MISO_API_KEY` env var. Exposes `api` property with grouped API methods (search, recommendation, products, users, interactions).

**Channel System** (`packages/server-commons/src/channel/`): Event-based streaming abstraction used throughout for data processing pipelines. Key classes:
- `Channel` - Base async iterable channel
- `WriteChannel` - Buffered writing with configurable batch sizes
- `UpgradeChannel` - Converts plain objects/strings to channel events
- `DowngradeChannel` - Converts channel events back to objects/strings

**Stream Upload**: Uses Node.js streams with rate limiting (`RateLimitingQueue`) for bulk data upload. Records are batched by count (`recordsPerRequest`) and size (`bytesPerRequest`) with throughput control (`bytesPerSecond`).

## Testing

Tests use [uvu](https://github.com/lukeed/uvu) framework. Test files are in `packages/server-commons/test/` with `.test.js` suffix. Assertions use `uvu/assert`.

## Release Process

Publishing is automated via GitHub Actions on release. The workflow:
1. Runs tests
2. Updates version across all packages using `npm run version`
3. Publishes all workspaces to npm (uses `--tag beta` for prerelease)
