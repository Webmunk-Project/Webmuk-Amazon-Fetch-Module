/* global chrome, moment */

(function () {
  const searchSite = {
    resultCount: 0,
    linkCache: {}
  }

  searchSite.matchesSearchSite = function (location) {
    if (['www.amazon.com'].includes(location.host) === false) {
      return false
    }

    if (location.href.includes('/gp/your-account/order-history/')) {
      return true
    }

    if (location.href.includes('/gp/your-account/order-details/')) {
      return true
    }

    if (location.href.includes('/ap/signin')) {
      return true
    }

    return false
  }

  const fetchOrders = function () {
    chrome.runtime.sendMessage({
      content: 'amazon_fetch_retrieve_order_details'
    }, function (message) {
      console.log('amazon_fetch_retrieve_order_details: ' + message)

      if (message !== null) {
        window.location.href = message
      }
    })
  }

  searchSite.extractResults = function () {
    console.log('searchSite.extractResults ' + window.location)

    if (window.amazonResultsFetched === undefined) {
      window.amazonResultsFetched = new Date()

      if (window.location.href.includes('/gp/your-account/order-history/')) {
        const locationUrl = new URL(window.location.href)

        if (locationUrl.searchParams.has('startIndex') === false) {
          const orderCount = parseInt($('span.num-orders').text().replace(/\D/g, ''))

          let orderOffset = 10

          while (orderOffset < orderCount) {
            locationUrl.searchParams.set('startIndex', '' + orderOffset)

            const orderLink = locationUrl.toString()

            chrome.runtime.sendMessage({
              content: 'amazon_fetch_queue_order_lookup',
              url: orderLink,
              count: orderCount
            }, function (message) {
              console.log('[Amazon Fetch] Queued order page: ' + orderLink)
              console.log(message)
            })

            orderOffset += 10
          }

          const params = new URLSearchParams(window.location.search)

          chrome.runtime.sendMessage({
            content: 'record_data_point',
            generator: 'webmunk-amazon-order-count',
            payload: {
              count: orderCount,
              period: params.get('orderFilter')
            }
          }, function (message) {

          })
        }

        const orderLinks = document.querySelectorAll('.yohtmlc-order-details-link')

        orderLinks.forEach(function (element) {
          const link = element.getAttribute('href')

          chrome.runtime.sendMessage({
            content: 'amazon_fetch_queue_order_lookup',
            url: link
          }, function (message) {
            console.log('[Amazon Fetch] Queued: ' + link)
            console.log(message)
          })
        })

        fetchOrders()
      } else if (window.location.href.includes('/gp/your-account/order-details')) {
        const orderDetails = {
          items: []
        }

        $('.yohtmlc-item').each(function (index, element) {
          const item = {}

          const link = $(element).find('a.a-link-normal[href*="/gp/product/"]')

          item.url = link.attr('href')
          item.title = link.text().trim()
          item.asin = item.url.split('/')[3]

          const price = $(element).find('.a-color-price')
          item.price = price.text().trim()

          const condition = $(element).find('.a-row:has(.a-text-bold:contains("Condition:"))')
          item.condition = condition.find('.a-color-secondary:not(.a-text-bold)').text().trim()

          const seller = $(element).find('.a-size-small:contains("Sold by:")')
          item.seller = seller.find('.a-link-normal').text().trim().split('\n')[0].trim()

          orderDetails.items.push(item)
        })

        const orderDateText = $('.order-date-invoice-item:contains("Ordered on")').text()
        const orderDate = moment(orderDateText.replace('Ordered on', '').trim(), 'MMMM DD, YYYY')
        orderDetails['order-date'] = orderDate.toISOString()

        const orderNumber = $('.order-date-invoice-item:contains("Order#")')
        orderDetails['order-number'] = orderNumber.find('bdi').text().trim()

        const orderSummary = $('#od-subtotals')

        const subtotal = orderSummary.find('.a-row:has(:contains("Subtotal"))')
        orderDetails['order-subtotal'] = subtotal.find('.a-span-last .a-color-base').text().trim()

        const shipping = orderSummary.find('.a-row:has(:contains("Shipping"))')
        orderDetails['order-shipping'] = shipping.find('.a-span-last .a-color-base').text().trim()

        const pretaxTotal = orderSummary.find('.a-row:has(:contains("Total before tax"))')
        orderDetails['order-pretax-total'] = pretaxTotal.find('.a-span-last .a-color-base').text().trim()

        const taxTotal = orderSummary.find('.a-row:has(:contains("Estimated tax"))')
        orderDetails['order-tax'] = taxTotal.find('.a-span-last .a-color-base').text().trim()

        const grandTotal = orderSummary.find('.a-row:has(:contains("Grand Total"))')
        orderDetails['order-total'] = grandTotal.find('.a-span-last .a-color-base').text().trim()

        const orderDestination = $('.displayAddressCityStateOrRegionPostalCode')

        if (orderDestination.length > 0) {
          orderDetails['order-destination'] = orderDestination.text().trim()
        }

        const orderDelivered = $('.a-row span.a-text-bold:contains("Delivered ")')

        if (orderDelivered.length > 0) {
          orderDetails['order-delivered'] = moment(orderDelivered.text().replaceAll('Delivered ', '').trim(), 'MMM DD, YYYY').toISOString()
        }

        chrome.runtime.sendMessage({
          content: 'record_data_point',
          generator: 'webmunk-amazon-order',
          payload: orderDetails
        }, function (message) {

        })

        fetchOrders()
      } else if (window.location.href.includes('/ap/signin')) {
        chrome.runtime.sendMessage({
          content: 'amazon_sign_in_required'
        }, function (message) {
        })
      }
    }
  }

  window.registerSearchMirrorSite('amazon', searchSite)
})(); // eslint-disable-line semi, no-trailing-spaces
