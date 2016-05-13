const adaptermanager = require('./adaptermanager');
const utils = require('./utils');

export const auctionManager = (function() {
  var _auctions = [];

  function _createAuction() {
    const auction = new Auction();
    _addAuction(auction);
    return auction;
  }

  function _getAuction(auctionId) {
    _auctions.find(auction => auction.auctionId === auctionId);
  }

  function _addAuction(auction) {
    _auctions.push(auction);
  }

  function _removeAuction(auction) {
    _auctions.splice(_auctions.indexOf(auction), 1);
  }

  function _findAuctionsByBidderCode(bidderCode) {
    var _bidderCode = bidderCode;
    return _auctions.filter(_auction => _auction.getBidderRequests()
      .filter(bidderRequest => bidderRequest.bidderCode === _bidderCode));
  }

  function Auction() {
    var _id = utils.getUniqueIdentifierStr();
    var _adUnits = [];
    var _targeting = [];
    var _bidderRequests = [];
    var _bidsReceived = [];

    this.setAdUnits = (adUnits) => _adUnits = adUnits;
    this.setTargeting = (targeting) => _targeting = targeting;
    this.setBidderRequests = (bidderRequests) => _bidderRequests = bidderRequests;
    this.setBidsReceived = (bidsReceived) =>_bidsReceived = _bidsReceived.concat(bidsReceived);
    this.setBidsReceived = (auctions) =>_auctions = _auctions.concat(auctions);

    this.getId = () => _id;
    this.getAdUnits = () => _adUnits;
    this.getBidderRequests = () => _bidderRequests;
    this.getBidsReceived = () => _bidsReceived;
    this.getTargeting = () => _targeting;

    this.callBids = function callBids() {
      adaptermanager.callBids(this);
    };
  }

  return {
    createAuction() {
      return _createAuction();
    },

    getAuction() {
      return _getAuction(...arguments);
    },

    getSingleAuction() {
      return _auctions[0] || _createAuction();
    },

    findAuctionByBidderCode() {
      return _findAuctionsByBidderCode(...arguments);
    },

    findBidderRequestByBidId({ adId }) {
      return _auctions.map(auction => auction.getBidderRequests()
    .find(request => request.bids
      .find(bid => bid.adId === adId)))
    .reduce((a, b) => a || b);
    }
  };
}());
