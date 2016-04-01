import CONSTANTS from 'src/constants.json';
import { loadScript } from 'src/adloader';

const events = require('src/events');
const utils = require('../../utils');

const BID_REQUESTED = CONSTANTS.EVENTS.BID_REQUESTED;
const BID_TIMEOUT = CONSTANTS.EVENTS.BID_TIMEOUT;
const BID_RESPONSE = CONSTANTS.EVENTS.BID_RESPONSE;
const BID_WON = CONSTANTS.EVENTS.BID_WON;

var _timedOutBidders = [];

export default function AnalyticsAdapter({ global, url, handler }) {
  var _queue = [];
  var _eventCount = 0;
  var _enableCheck = true;

  loadScript(url, _emptyQueue);

  return {
    track: _track,
    enqueue: _enqueue,
    enableAnalytics: _enable
  };

  function _track({ eventType, args }) {
    window[global](handler, eventType, args);
  }

  function _enqueue({ eventType, args }) {
    const _this = this;

    if (global && window[global] && eventType && args) {
      _track({ eventType, args });
    } else {
      _queue.push(function () {
        _eventCount++;
        _this.track({ eventType, args });
      });
    }
  }

  function _enable() {
    //first send all events fired before enableAnalytics called
    utils._each(events.getEvents(), event => {
      if (!event) {
        return;
      }

      const { eventType, args } = event;

      if (eventType === BID_TIMEOUT) {
        _timedOutBidders = args.bidderCode;
      } else {
        _enqueue({ eventType, args });
      }
    });

    //Next register event listeners to send data immediately

    //bidRequests
    events.on(BID_REQUESTED, args => this.enqueue({ eventType: BID_REQUESTED, args }));
    events.on(BID_RESPONSE, args => this.enqueue({ eventType: BID_RESPONSE, args }));
    events.on(BID_TIMEOUT, args => this.enqueue({ eventType: BID_TIMEOUT, args }));
    events.on(BID_WON, args => this.enqueue({ eventType: BID_WON, args }));

    // finally set this function to return log message, prevents multiple adapter listeners
    this.enableAnalytics = function _enable() {
      return utils.logMessage(`Analytics adapter for "${global}" already enabled, unnecessary call to \`enableAnalytics\`.`);
    };
  }

  function _emptyQueue() {
    if (_enableCheck && typeof window[global] === 'function') {
      for (var i = 0; i < _queue.length; i++) {
        _queue[i]();
      }

      //override push to execute the command immediately from now on
      _queue.push = function (fn) {
        fn();
      };

      //turn check into NOOP
      _enableCheck = false;
    }

    utils.logMessage(`event count sent to ${global}: ${_eventCount}`);
  }
}
