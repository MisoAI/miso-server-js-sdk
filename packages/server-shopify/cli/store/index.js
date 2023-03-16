import products from './products.js';

function build(yargs) {
  return yargs
    .command(products);
}

export default {
  command: 'store',
  desc: 'Shopify store APIs',
  builder: build,
};
