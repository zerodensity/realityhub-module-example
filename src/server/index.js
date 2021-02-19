// Copyright (c) 2021 Zero Density Inc.
//
// This file is part of realityhub-module-example.
//
// realityhub-module-example is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License version 2, as published by 
// the Free Software Foundation.
//
// realityhub-module-example is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with realityhub-module-example. If not, see <https://www.gnu.org/licenses/>.

const { BrokerClient } = require("@zerodensity/realityhub-api");
const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const REALITY_HUB_PORT = process.env.REALITY_HUB_PORT || 3000;

class ModuleExampleBackend {
  constructor() {
    this.pollingInterval = 3000;
    this.pollTimer = null;
  }
  
  async initBroker() {
    this.brokerClient = await BrokerClient.initModule({
      moduleName: 'zero_density.realityhub_module_example',
      serverURL: 'http://127.0.0.1:5000/',
      hub: {
        host: '127.0.0.1',
        port: REALITY_HUB_PORT,
      },
    });

    this.api = this.brokerClient.api.zero_density.realityhub_module_example;
    this.realityWorldAPI = this.brokerClient.api.hub.reality_world;

    await this.brokerClient.registerAPIHandlers({
      startPolling: this.startPolling,
      stopPolling: this.stopPolling,
      getStatus: this.getStatus,
    }, this);

    this.brokerClient.once('disconnect', () => {
      this.brokerClient.destroy();
      this.stopPolling();
      this.restart();
    });
  }

  startHTTPServer() {
    const app = express();

    app.use(express.static(path.join(__dirname, '../client')));

    app.listen(5000, '0.0.0.0', () => {
      console.info('Module example backend started on port 5000');
    });
  }

  init() {
    this.startHTTPServer();
    this.restart();
  }

  async restart() {
    try {
      await this.initBroker();
    } catch(e) {
      console.error('Unable to initialize Broker, exiting..');
      process.exit(1);
    }

    this.startPolling();
  }

  startPolling() {
    if (this.pollTimer) return;
    this.poll();
    this.api.emit('statuschange', { status: 'started' });
  }

  stopPolling() {
    if (!this.pollTimer) return;

    clearTimeout(this.pollTimer);
    this.pollTimer = null;
    this.api.emit('statuschange', { status: 'stopped' });
  }

  getStatus() {
    return {
      status: !!this.pollTimer ? 'started' : 'stopped',
    };
  }

  async poll() {
    this.pollTimer = setTimeout(this.poll.bind(this), this.pollingInterval);

    try {
      const response = await fetch(`http://127.0.0.1:${REALITY_HUB_PORT}/examples/exchange-rates`);
      const exchangeRatesJSON = await response.text();

      await this.realityWorldAPI.setNodeProperty({
        NodePath: 'Forex_0',
        PropertyPath: 'Default//JXD/0',
        Value: exchangeRatesJSON,
      });
      
      this.api.emit('exchangerates', JSON.parse(exchangeRatesJSON));
    } catch (ex) {
      console.error(ex.message);
    }
    
  }
}

const moduleExampleBackend = new ModuleExampleBackend();
moduleExampleBackend.init();
