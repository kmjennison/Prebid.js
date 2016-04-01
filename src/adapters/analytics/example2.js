/**
 * example2.js - analytics adapter for Example2 Analytics example
 */

import adapter from 'AnalyticsAdapter';
const utils = require('../../utils');

const global = 'ExampleAnalyticsGlobalObject2';
const url = 'http://localhost:9999/src/adapters/analytics/libraries/example2.js';
const handler = 'send';

export default utils.extend(adapter(
  {
    global,
    url,
    handler
  }
),
  {
  // Override AnalyticsAdapter functions by supplying custom methods
  track({ eventType, args }) {
    console.log('track function override for Example2 Analytics');
    window[global](handler, eventType, args);
  }
});
