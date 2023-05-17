/* global */

(function () {
  window.searchMirrorSites = {}

  window.registerSearchMirrorSite = function (siteKey, siteObject) {
    window.searchMirrorSites[siteKey] = siteObject
  }

  window.registerModuleCallback(function (config) {
    let searchConfig = config['amazon-fetch']

    if (searchConfig === undefined) {
      searchConfig = {
        enabled: true
      }
    }

    if (searchConfig.enabled) {
      if (window.location === window.parent.location) { // Top frame
        // Skip - only activate in iFrame...
      } else {
        let matchedSearchSiteKey = null

        for (const [siteKey, siteObject] of Object.entries(window.searchMirrorSites)) {
          if (siteObject.matchesSearchSite(window.location)) {
            matchedSearchSiteKey = siteKey
          }
        }

        console.log('[Amazon Fetch] Eval\'ing ' + window.location.href + '.')
        console.log(matchedSearchSiteKey)

        if (matchedSearchSiteKey !== null) {
          console.log('[Amazon Fetch] Fetching from ' + window.location.href + '.')

          const thisSearchSite = window.searchMirrorSites[matchedSearchSiteKey]

          window.registerModulePageChangeListener(thisSearchSite.extractResults)
        } else {
          // console.log('[Search Mirror] ' + window.location.href + ' is not a search site (secondary).')
        }
      }
    }
  })
})(); // eslint-disable-line semi, no-trailing-spaces
