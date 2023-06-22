/* global chrome, registerCustomModule, registerMessageHandler */

(function () {
  const stringToId = function (str) {
    let id = str.length

    Array.from(str).forEach((it) => {
      id += it.charCodeAt()
    })

    return id * 10000 + 7964
  }

  const queuedOrderUrls = []
  let queueSize = 0

  const clearOrderQueue = function (request, sender, sendResponse) {
    while (queuedOrderUrls.length > 0) {
      queuedOrderUrls.pop()
    }

    queueSize = 0

    console.log('[Amazon Fetch] Cleared order queue due to network issue.')

    sendResponse('cleared')
  }

  const queueOrderLookup = function (request, sender, sendResponse) {
    console.log('[Amazon Fetch] Queuing ' + request.url + '...')

    if (queuedOrderUrls.includes(request.url) === false) {
      queuedOrderUrls.push(request.url)
    }

    queuedOrderUrls.sort()

    queueSize += 1

    chrome.runtime.sendMessage({
      content: 'amazon_fetch_update_progress',
      queueSize,
      remaining: queuedOrderUrls.length
    }, function (message) {

    })

    return true
  }

  const fetchOrderDetails = function (request, sender, sendResponse) {
    let orderUrl = null

    while (orderUrl === null && queuedOrderUrls.length > 0) {
      orderUrl = queuedOrderUrls.pop()

      if (orderUrl.includes('/gp/your-account/order-history/') || orderUrl.includes('/gp/your-account/order-details/')) {
        // Order URL is good
      } else {
        orderUrl = null
      }
    }

    chrome.runtime.sendMessage({
      content: 'amazon_fetch_update_progress',
      queueSize,
      remaining: queuedOrderUrls.length
    }, function (message) {
    })

    console.log('[Amazon Fetch] Fetching order details for ' + orderUrl)

    sendResponse(orderUrl)
  }

  const amazonSignInRequired = function (request, sender, sendResponse) {
    console.log('[Amazon Fetch] Prompting to sign in...')

    chrome.runtime.sendMessage({
      content: 'amazon_sign_in_required'
    }, function (message) {

    })

    return true
  }

  registerCustomModule(function (config) {
    if (config === null || config === undefined) {
      config = {}
    }

    const urlFilters = [
      '||www.amazon.com/'
    ]

    for (const urlFilter of urlFilters) {
      const stripRule = {
        id: stringToId('amazon-fetch-' + urlFilter),
        priority: 1,
        action: {
          type: 'modifyHeaders',
          responseHeaders: [
            { header: 'x-frame-options', operation: 'remove' },
            { header: 'content-security-policy', operation: 'remove' }
          ]
        },
        condition: { urlFilter, resourceTypes: ['main_frame', 'sub_frame'] }
      }

      chrome.declarativeNetRequest.updateSessionRules({
        addRules: [stripRule]
      }, () => {
        if (chrome.runtime.lastError) {
          console.log('[Amazon Fetch] ' + chrome.runtime.lastError.message)
        }
      })

      console.log('[Amazon Fetch] Added URL filter: ' + urlFilter)
    }

    registerMessageHandler('amazon_clear_queue', clearOrderQueue)
    registerMessageHandler('amazon_fetch_queue_order_lookup', queueOrderLookup)
    registerMessageHandler('amazon_fetch_retrieve_order_details', fetchOrderDetails)
    registerMessageHandler('amazon_sign_in_required', amazonSignInRequired)

    console.log('[Amazon Fetch] Initialized.')
  })
})()
