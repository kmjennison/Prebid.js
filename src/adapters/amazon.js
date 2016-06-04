
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
   * Converts a an array of [width, height] to a string of "widthxheight".
   * @param  {array[number]}  Array of two numbers like `[300, 250]` or `[728, 90]`
   * @return {string}  A string like "300x250"
   */
  function _adSizeArrToStr(adSizeArr) {
    return adSizeArr[0] + 'x' + adSizeArr[1];
  }

  /**
   * Handler after a bid is returned, which adds the bid response to the bid manager.
   * @param  {string} placementCode The string ID `placementCode` of this bid in the Prebid config
   * @param  {array[number]}  Array of two numbers like `[300, 250]` or `[728, 90]`
   */
  function _handleBidResponse(placementCode, adSize) {
    var bidObject;

    var adSizeStr = _adSizeArrToStr(adSize);

    // Get the Amazon ad keys (i.e. obfuscated CPM) returned for this size.
    // These will be strings of form "a300x250p2" and "a728x90p1".
    // The `adSize` parameter should be a string of form `350x250`.
    var tokens = amznads.getTokens(adSizeStr);
    // var tokens = ['a300x250p2']; // Fake tokens for development.

    _logMsg('Tokens for placement ' + placementCode + ' and size ' + JSON.stringify(adSizeStr) + ': ' + JSON.stringify(tokens));

    if (tokens.length > 0) {
      tokens.forEach(function(key) {
        bidObject = bidfactory.createBid(1);
        bidObject.bidderCode = 'amazon';
        bidObject.cpm = 0.10; // Placeholder, since Amazon returns an obfuscated CPM.
        bidObject.ad = key; // Placeholder, since we'll load ad creative via the ad server.
        bidObject.width = adSize[0];
        bidObject.height = adSize[1];

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

  /**
   * Returns a callback function for the specific placement and ad size.
   * Note that Amazon A9 currently only allows one ad per size per page.
   * @param  {string} placementCode The string ID `placementCode` of this bid in the Prebid config
   * @param  {array[number]}  Array of two numbers like `[300, 250]` or `[728, 90]`
   */
  function _generateBidResponseHandler(placementCode, adSize) {
    return (function() {
      _handleBidResponse(placementCode, adSize);
    });
  }

  function _requestBids(params) {
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

        // Create a separate callback for each ad unit.
        var placementCode = bid.placementCode;
        var adSizeArr = [bid.params.width, bid.params.height];
        var callback = _generateBidResponseHandler(placementCode, adSizeArr);

        var adSizeStr = _adSizeArrToStr(adSizeArr);

        // params: id, callbackFunction, timeout, size
        amznads.getAdsCallback(bid.params.amazonId, callback, timeout, adSizeStr);
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
