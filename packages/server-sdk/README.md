# Miso Node.js SDK

## Setup

1. Install Node.js.

2. Install the package locally:

```bash
npm i @miso.ai/server-sdk
```

Or, install the package globally:

```bash
npm i -g @miso.ai/server-sdk
```

Or, use `npx` to run the commands, which will guide the package installation.

3. Put the following settings in your `.env` file:

```env
MISO_API_KEY=your_api_key
```

## Usage

### Help message

```bash
miso --help
miso products --help
```

### Get

Get a product by `product_id`:

```bash
miso products get [id]
```

### Upload

Given a JSON lines file of products:

```jsonl
{"product_id": "1", ...}
{"product_id": "2", ...}
...
```

Upload products by piping records into the command:

```bash
cat records.jsonl | miso products upload
```

You can dry run:

```bash
cat records.jsonl | head -20 | miso products upload --dry
```

When uploading a large amount of records, tt's recommended to display the progress status and pipe errors to a log file:

```bash
cat records.jsonl | miso products upload -p 2> error.log
```

The error log is a JSON line file consisting request payloads and response bodies:

```jsonl
{"response": { (Miso API response) }, "payload": { "data": [ ...(records uploaded) ] }}
...
```

You can extract the failed records from the error log to work on them, so you don't need to reprocess the whole data set again.

### Delete

Given a file of product IDs:

```txt
product_id_1
product_id_2
...
```

Delete products by piping IDs into the command:

```bash
cat product_ids.txt | miso products delete -p 2> error.log
```
