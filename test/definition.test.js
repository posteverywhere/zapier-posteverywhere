'use strict';

const schemaTools = require('zapier-platform-core/src/tools/schema');
const App = require('../index');

describe('app definition', () => {
  it('passes the Zapier schema', () => {
    expect(schemaTools.validateApp(schemaTools.prepareApp(App))).toEqual([]);
  });

  it('follows Zapier naming rules for triggers', () => {
    for (const t of Object.values(App.triggers)) {
      expect(t.display.description).toMatch(/^Triggers when .+\.$/);
    }
  });

  it('gives every visible operation a sample with an id', () => {
    const ops = [
      ...Object.values(App.triggers),
      ...Object.values(App.creates),
      ...Object.values(App.searches),
    ];
    for (const op of ops) {
      expect(op.operation.sample).toBeDefined();
      expect(op.operation.sample.id).toBeDefined();
    }
  });
});
