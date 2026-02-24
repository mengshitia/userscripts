// ==UserScript==
// @name                  youtube playback volume fix
// @namespace             https://github.com/mengshitia/userscripts
// @description           Prevent Youtube videos' playback volume from changing.
// @version               1.0
// @match                 https://www.youtube.com/*
// @grant                 none
// @run-at                document-end
// ==/UserScript==

onUrlChange();

if (self.navigation) {
  navigation.addEventListener('navigatesuccess', onUrlChange);
} else {
  // Observe url changes on a SPA site.
  // See the documentation: "https://violentmonkey.github.io/api/matching/#matching-spa-sites-like-fb-github-twitter-youtube"
  let u = location.href;
  new MutationObserver(() => u !== (u = location.href) && onUrlChange()).observe(document, {subtree: true, childList: true});
}

function onUrlChange() {
  if (!location.pathname.startsWith('/watch')) {
    // Not in the watch section, do nothing.
    return;
  }
  // In the watch section:
  const VOLUME_HANDLE = () => document.querySelector('.video-stream').volume = 1.0;
  // Observe page changes.
  new MutationObserver((records, observer) => {
    let vst = document.querySelector('.video-stream');
    if (vst === null) {
      // Video stream not found, do nothing but keep querying.
      return;
    }
    // Video stream was found,
    // add event listeners to handle the volume change.
    vst.addEventListener('play', VOLUME_HANDLE);
    vst.addEventListener('volumechange', VOLUME_HANDLE);
    VOLUME_HANDLE();
    // Stop observing the page, then print a message.
    observer.disconnect();
    console.log('Ytb Vol Fix: Playback volume control activated, stop observing.');
  }).observe(document, {subtree: true, childList: true});
}
