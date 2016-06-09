
var utils = require('../utils.js');
var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');


// Adapted from the historical Amazon adapter on Prebid.js:
// https://github.com/prebid/Prebid.js/blob/353fa1994646bbf1f2619b6a01b7e930ce51affa/src/adapters/amazon.js
var AmazonAdapter = function AmazonAdapter() {

  // Override standard bidder settings.
  var _defaultBidderSettings = {
    // Always send Amazon's bid for decisionmaking on the ad server side
    // because the client-size CPM is encoded.
    alwaysUseBid: true,
    adserverTargeting: [
      {
        // Amazon A9's default key name.
        key: 'amznslots',
        val: function (bidResponse) {
          return bidResponse.amazonKey;
        }, 
      }, {
        // The Prebid ad ID so that we can still use Prebid's `renderAd`
        // function. Note that if an Amazon ad wins the auction, it must
        // call `renderAd` using the value of `hb_adid_amazon` rather than
        // the default `hb_adid`.
        key: "hb_adid_amazon",
        val: function (bidResponse) {
          return bidResponse.adId;
        }
      }
    ]
  };
  bidmanager.registerDefaultBidderSetting('amazon', _defaultBidderSettings);

  var bids;

  // For debugging only. Set this to true to pretend that A9 returned ads.
  // This only works if Prebid.js is in debugging mode.
  // The `amznslots` key value set in ad server targeting will take the form
  // "a3x2p1", where the "3x2" string is replaced with the "size" value in
  // the bid parameter settings.
  var fakeAdsForDebug = false;

  // For debugging.
  function _logMsg(msg) {
    // @if NODE_ENV='debug'
    utils.logMessage('AMAZON ADAPTER: ' + msg);
  }

  /**
   * Get the A9 ads object.
   * @return {object} The value of `amznads.ads`
   */
  function _getAmznAds() {
    return amznads.ads;
  }

  /**
   * Return whether A9 has ads for this ad size.
   * @param  {string} adSize The value of the "size" parameter in the bid
   *   configuration
   * @return {Boolean} Whether A9 has an ad for this ad size
   */
  function _amznHasAds(adSize) {
    if (fakeAdsForDebug) {
      return true;
    }
    return amznads.hasAds(adSize);
  }

  /**
   * Return the array of A9 ad tokens for this ad size
   * @param  {string} adSize The value of the "size" parameter in the bid
   *   configuration
   * @return {array[string]} The list of A9 ad tokens
   */
  function _amznGetTokens(adSize) {
    if (fakeAdsForDebug) {
      return ['a' + adSize + 'p1'];
    }

    // Get the Amazon ad tokens for this ad size.
    // This will be a an array[string] of form ["a3x2p2"].
    return amznads.getTokens(adSize);
  }

  /**
   * Handler after a bid is returned, which adds the bid response to the
   * bid manager.
   */
  function _handleBidResponse() {
    var bidObject;
    _logMsg('Handling bid response.');

    bids.forEach(function(bid) {
      var bidAdSize = bid.params.size;

      // If A9 did not return an ad for this ad size, or the A9 ads object
      // is unavailable, indicate an ad was not returned.
      if (!_amznHasAds(bidAdSize) || !_getAmznAds()) {
        _logMsg('No bid returned for placement ' + bid.placementCode + '.');
        bidObject = bidfactory.createBid(2);
        bidObject.bidderCode = 'amazon';
        bidmanager.addBidResponse(bid.placementCode, bidObject);
        return;
      }

      // Use the bid's ads size to fetch the A9 ad key.
      var key = _amznGetTokens(bidAdSize)[0];

      bidObject = bidfactory.createBid(1);
      bidObject.bidderCode = 'amazon';
      bidObject.cpm = 0.10; // Placeholder, since A9 returns an obfuscated CPM
      bidObject.ad = _getAmznAds()[key];
      bidObject.width = bid.params.width;
      bidObject.height = bid.params.height;

      // Add Amazon's key as a custom value. We'll use this to set a
      // targeting key/value for our ad server.
      bidObject.amazonKey = key;

      _logMsg('Bid for placement ' + bid.placementCode + ':' +
        JSON.stringify(bidObject));
      bidmanager.addBidResponse(bid.placementCode, bidObject);

    });
  }

  function _requestBids(params) {

    // Note: adding the query parameter value `amzn_debug_mode=1` to the page
    // URL will make the `amznads` object available on the window scope, which
    // can be helpful for debugging.
    if (amznads) {

      // Make sure required bid parameters exist.
      var bidParamErrors = false;
      bids.forEach(function(bid) {
        _logMsg('Bid: ' + JSON.stringify(bid));

        function paramError(paramName) {
          bidParamErrors = true;
          utils.logError('Amazon unable to bid: Missing required `' +
            paramName + '` parameter in bid.');
        }

        if (!bid.params.amazonId) {
          paramError('amazonId');
        }
        if (!bid.params.width) {
          paramError('width');
        }
        if (!bid.params.height) {
          paramError('height');
        }
        if (!bid.params.size) {
          paramError('size');
        }
      });

      // There was an error in one of the bid parameters, so don't call A9.
      if (bidParamErrors) {
        return;
      }

      // params: id, callbackFunction, timeout, size
      amznads.getAdsCallback(bids[0].params.amazonId, _handleBidResponse);

    } else {
      _logMsg('Could not load A9 script.');
    }
  }

  function _callBids(params) {
    bids = params.bids || [];

    if (bids.length < 1) {
      // No bids, so no need to call A9.
      return;
    }

    // To be safe, turn off the `fakeAdsForDebug` functionality if Prebid
    // debugging is not on.
    if (!utils.debugTurnedOn()) {
      fakeAdsForDebug = false;
    }

    adloader.loadScript('//c.amazon-adsystem.com/aax2/amzn_ads.js',
      function () {
        _requestBids(params);
      }
    );
  }

  return {
    callBids: _callBids,
  };
};

module.exports = AmazonAdapter;
