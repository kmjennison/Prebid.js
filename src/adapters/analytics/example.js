/**
 * example.js - analytics adapter for Example Analytics example
 */

import adapter from 'AnalyticsAdapter';

export default adapter(
  {
    global: 'ExampleAnalyticsGlobalObject',
    url: 'http://localhost:9999/src/adapters/analytics/libraries/example.js',
    handler: 'on'
  }
);
