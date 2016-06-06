
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');


// Adapted from the historical Amazon adapter on Prebid.js:
// https://github.com/prebid/Prebid.js/blob/353fa1994646bbf1f2619b6a01b7e930ce51affa/src/adapters/amazon.js
var AmazonAdapter = function AmazonAdapter() {

  // Override standard bidder settings.
  var _defaultBidderSettings = {
    // Always send Amazon's bid for decisionmaking on the ad server side because
    // the client-size CPM is encoded.
    alwaysUseBid: true,
    adserverTargeting: [{
      key: 'amznslots',
      val: function (bidResponse) {
        return bidResponse.amazonKey;
      }
    }]
  };
  bidmanager.registerDefaultBidderSetting('amazon', _defaultBidderSettings);

  var bids;

  // For debugging.
  function _logMsg(msg) {
    // @if NODE_ENV='debug'
    utils.logMessage('AMAZON ADAPTER: ' + msg);
  }

  /**
   * Handler after a bid is returned, which adds the bid response to the bid manager.
   * @param  {string} placementCode The string ID `placementCode` of this bid in the Prebid config
   * @param  {number} width The width of the ad
   * @param  {number} height The height of the ad
   * @param  {string} size The ad size string that Amazon uses
   */
  function _handleBidResponse(placementCode, width, height, size) {
    var bidObject;

    // Get the Amazon ad keys (i.e. obfuscated CPM) returned for this size.
    // These will be strings of form "a300x250p2" and "a728x90p1".
    // The `size` parameter should be a string of form `350x250`.
    var tokens = amznads.getTokens(size);
    // var tokens = ['a300x250p2']; // Fake tokens for development.

    _logMsg('Tokens for placement ' + placementCode + ' and size ' + JSON.stringify(size) + ': ' + JSON.stringify(tokens));

    if (tokens.length > 0) {
      tokens.forEach(function(key) {
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = 'amazon';
        bidObject.cpm = 0.10; // Placeholder, since Amazon returns an obfuscated CPM.
        bidObject.ad = key; // Placeholder, since we'll load ad creative via the ad server.
        bidObject.width = width;
        bidObject.height = height;

        // Add Amazon's key.
        bidObject.amazonKey = key;  

        _logMsg('Bid for placement ' + placementCode + ':' + JSON.stringify(bidObject));
        bidmanager.addBidResponse(placementCode, bidObject);
      });
    } else {
      // Indicate an ad was not returned.
      _logMsg('Bid not returned for placement ' + placementCode + '.');
      bidObject = bidfactory.createBid(2);
      bidObject.bidderCode = 'amazon';
      bidmanager.addBidResponse(placementCode, bidObject);
    }
  }

  function _requestBids(params) {

    // Note: adding the query parameter value `amzn_debug_mode=1` to the page URL
    // will make the `amznads` object available on the window scope, which can
    // be helpful for debugging.
    if (amznads) {
      var timeout = window.PREBID_TIMEOUT || 1000;
      bids = params.bids || [];

      bids.forEach(function(bid) {

        _logMsg('Bid: ' + JSON.stringify(bid));

        // Check required bid parameters.
        if (!bid.params.amazonId) {
          utils.logError('Amazon unable to bid: Missing required `amazonId` parameter in bid.');
        }
        if (!bid.params.width) {
          utils.logError('Amazon unable to bid: Missing required `width` parameter in bid.'); 
        }
        if (!bid.params.height) {
          utils.logError('Amazon unable to bid: Missing required `height` parameter in bid.'); 
        }
        if (!bid.params.size) {
          utils.logError('Amazon unable to bid: Missing required `size` parameter in bid.'); 
        }

        // Create a separate callback for each ad unit.
        var callback = function() {
          _handleBidResponse(bid.placementCode, bid.params.width,
            bid.params.height, bid.params.size);
        };

        // params: id, callbackFunction, timeout, size
        amznads.getAdsCallback(bid.params.amazonId, callback, timeout, bid.params.size);
      });
    }
  }

  function _callBids(params) {
    adloader.loadScript('//c.amazon-adsystem.com/aax2/amzn_ads.js', function () {
      _requestBids(params);
    });
  }

  return {
    callBids: _callBids,
  };
};

module.exports = AmazonAdapter;
