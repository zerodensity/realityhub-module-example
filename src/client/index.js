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

class ModuleExampleClient {
  async start() {
    this.containerElement = document.createElement('div');

    const { brokerClient } = await window.registerRealityHubModule({
      name: 'zero_density.realityhub_module_example_client',
      label: 'Module Example',
      content: this.containerElement,
    });

    this.api = brokerClient.api.zero_density.realityhub_module_example;
    this.realityWorlAPI = brokerClient.api.hub.reality_world;

    // Download Module Example's HTML file and set it to our container element
    const response = await fetch('/modules/zero_density.realityhub_module_example/index.html');
    this.containerElement.innerHTML = await response.text();

    // Fetch the exchange rates so we can show something until the first exchangerates event
    const serverResponse = await fetch('/examples/exchange-rates');
    this.exchangeRates = await serverResponse.json();
    this.updateTableData(this.exchangeRates);

    // Bind "Auto Update" switch's change handler 
    const autoButton = this.containerElement.querySelector('#autoupdate');

    autoButton.addEventListener('input', (e) => {
      if (e.detail.property.Value) {
        this.api.startPolling();
      } else {
        this.api.stopPolling();
      }

      this.updateIconClasses(e.detail.property.Value);
    });

    // Subscribe to (polling) status change event
    this.api.on('statuschange', (e) => {
      const started = e.status === 'started';

      autoButton.property = {
        ...autoButton.property,
        Value: started,
      };
      
      this.containerElement.querySelectorAll('i.up-down-arrow').forEach((icon) => {
        this.updateIconClasses(started);
      });
    });

    // Get the current polling status
    const statusResponse = await this.api.getStatus();
    autoButton.property = {
      ...autoButton.property,
      Value: statusResponse.status === 'started',
    };
    this.updateIconClasses(statusResponse.status === 'started');

    // Bind "In" button's click handler 
    const inButton = this.containerElement.querySelector('#btnIn');
    
    inButton.addEventListener('click', () => {
      this.realityWorlAPI.callNodeFunction({
        NodePath: 'Forex_0',
        PropertyPath: '//PLAY/0',
      });
    });

    // Bind "Out" button's click handler 
    const outButton = this.containerElement.querySelector('#btnOut');

    outButton.addEventListener('click', () => {
      this.realityWorlAPI.callNodeFunction({
        NodePath: 'Forex_0',
        PropertyPath: '//REVERSE/0',
      });
    });

    // Bind "Update" button's click handler 
    const updateButton = this.containerElement.querySelector('#btnUpdate');

    updateButton.addEventListener('click', () => {
      const rows = this.containerElement.querySelectorAll('tbody tr');
      const nodeData = this.exchangeRates;

      for (let i = 0; i < rows.length; ++i) {
        const row = rows[i];
        nodeData[`line${i + 1}`].value = row.querySelector('reality-property').property.Value;
        nodeData[`line${i + 1}`].icon = row.classList.contains('up') ? 'up' : 'down';
      }

      this.realityWorlAPI.setNodeProperty({
        NodePath: 'Forex_0',
        PropertyPath: 'Default//JXD/0',
        Value: JSON.stringify(nodeData),
      });
    });

    // Subscribe to exchangerates event
    this.api.on('exchangerates', this.updateTableData.bind(this));

    this.containerElement.querySelectorAll('i.up-down-arrow').forEach((icon) => {
      icon.addEventListener('click', () => {
        if (autoButton.property.Value) return;
        icon.closest('tr').classList.toggle('up');
      });
    });

    // Locations properties and Go buttons
    const location1 = this.containerElement.querySelector('#location1');
    const location2 = this.containerElement.querySelector('#location2');
    const goBtn1 = this.containerElement.querySelector('#btnGoTo1');
    const goBtn2 = this.containerElement.querySelector('#btnGoTo2');

    // Set initial values of Location properties
    location1.property = {
      ...location1.property,
      Value: {
        Location: { X: 700, Y: 200, Z: 200 },
        Rotator: { Pitch: 0, Yaw: -158, Roll: 0 },
        Scale3D: { X: 1, Y: 1, Z: 1 },
      },
    };

    location2.property = {
      ...location2.property,
      Value: {
        Location: { X: 200, Y: -900, Z: 200 },
        Rotator: { Pitch: 0, Yaw: 116, Roll: 0 },
        Scale3D: { X: 1, Y: 1, Z: 1 },
      },
    };

    // Bind click handlers to Go buttons
    goBtn1.addEventListener('click', () => {
      this.realityWorlAPI.setNodeProperty({
        Value: location1.property.Value,
        NodePath: 'UserTrack_0',
        PropertyPath: 'Input//UserTransform/0',
        InterpType: 'EaseInOut',
        Duration: 2,
      });
    });

    goBtn2.addEventListener('click', () => {
      this.realityWorlAPI.setNodeProperty({
        Value: location2.property.Value,
        NodePath: 'UserTrack_0',
        PropertyPath: 'Input//UserTransform/0',
        InterpType: 'EaseInOut',
        Duration: 2,
      });
    });
  }

  updateIconClasses(autoUpdate) {
    this.containerElement.querySelectorAll('i.up-down-arrow').forEach((icon) => {
      if (autoUpdate) {
        icon.classList.remove('clickable');
      } else {
        icon.classList.add('clickable');
      }
    });
  }

  updateTableData(exchangeRates) {
    this.exchangeRates = exchangeRates;
    const rows = this.containerElement.querySelectorAll('tbody tr');
    const values = Object.values(this.exchangeRates);

    for (let i = 0; i < values.length; ++i) {
      const { value, icon } = values[i];
      const row = rows[i];
      const realityProperty = row.querySelector('reality-property');
      realityProperty.property = {
        ...realityProperty.property,
        Value: value,
      };
      row.classList.toggle('up', icon === 'up');
    }
  }
}

const moduleExampleClient = new ModuleExampleClient();
moduleExampleClient.start();
