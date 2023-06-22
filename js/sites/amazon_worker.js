/* global chrome */

(function () {
  chrome.webRequest.onCompleted.addListener(async function (details) {
    const patterns = [
      'www.amazon.com/gp/your-account/order-history',
      'www.amazon.com/gp/your-account/order-details',
      'www.amazon.com/ap/signin'
    ]

    for (const pattern of patterns) {
      if (details.url.includes(pattern)) {
        chrome.scripting.executeScript({
          target: {
            tabId: details.tabId, // eslint-disable-line object-shorthand
            allFrames: false,
            frameIds: [details.frameId]
          },
          files: ['/vendor/js/jquery.js', '/vendor/js/moment.min.js', '/js/app/content-script.js']
        })

        return
      }
    }
  }, {
    urls: ['<all_urls>']
  }, ['responseHeaders', 'extraHeaders'])

  chrome.webRequest.onErrorOccurred.addListener(async function (details) {
    const skip = ['net::ERR_ABORTED', 'net::ERR_CACHE_MISS']

    if (skip.includes(details.error)) {
      // Skip
    } else {
      chrome.runtime.sendMessage({
        content: 'amazon_clear_queue'
      }, function (message) {
        chrome.runtime.sendMessage({
          content: 'amazon_fetch_error',
          error: details.error
        }, function (message) {
        })
      })
    }
  }, {
    urls: ['<all_urls>']
  }, ['extraHeaders'])
})(); // eslint-disable-line semi, no-trailing-spaces
