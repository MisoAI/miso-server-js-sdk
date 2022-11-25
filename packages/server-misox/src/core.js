export default class CliCore {

  constructor({ config, yargs }) {
    this._config = config;
    this._yargs = yargs;
  }

  get config() {
    return this._config;
  }

  get yargs() {
    return this._yargs;
  }

  async _setup() {
    if (this._setupCalled) {
      throw new Error(`Setup called twice.`);
    }
    this._setupCalled = true;

    this._installBaseFeatures();

    await this._installPlugins();
  }

  _installBaseFeatures() {
    this._yargs
      .command({
        command: 'config',
        description: `Print configuration`,
        handler: () => console.log(this.config)
      });
  }

  async _installPlugins() {
    const { plugins = [] } = this.config;
    await Promise.all(plugins.map(plugin => this._installPlugin(plugin)));
  }

  async _installPlugin(plugin) {
    if (typeof plugin === 'string') {
      plugin = [plugin];
    }
    let [pkg, options = {}] = plugin;
    //if (options)
  }

}
