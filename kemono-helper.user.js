// ==UserScript==
// @name                  kemono helper
// @name:zh-CN            kemono 小帮手
// @namespace             https://github.com/mengshitia/userscripts
// @description           Make downloading contents easier.
// @version               1.3a
// @match                 https://kemono.*/*
// @grant                 GM_info
// @grant                 GM_addElement
// @grant                 GM_addStyle
// @grant                 GM_notification
// @grant                 GM_setClipboard
// @grant                 GM_download
// @run-at                document-end
// ==/UserScript==

// Issue: Direct download cannot determine whether a file has been downloaded correctly.
// Solution: Use callback event object to check the "status" value, if an error occurs, abort the download.

// Issue: Some files have the same sha256 checksum, which means they are the same file. Currently just download them all.
// Issue: Much of the code is duplicated and requires optimization.
// Plan: I18n.

// Name of this script, used in notifications.
const SCRIPT_NAME = GM_info.script.name;

// *****************************************************************
// Kemono Helper Elements:
class KHE {
  constructor(className, selectorPrefix) {
    this.name = className;
    this.selector = `${selectorPrefix}${className}`
  }
  toString() {
    return this.selector;
  }
}

const khe = {
  // Actions:
  actionWrapper: new KHE('kh-action-wrapper', '.'),
  actionButton: new KHE('kh-action-btn', '.'),
  actionPanel: new KHE('kh-action-panel', '.'),
  // End of Actions.
  // Download Panel:
  downloadPanelWrapper: new KHE('kh-download-panel-wrapper', '.'),
  downloadPanel: new KHE('kh-download-panel', '#'),
  downloadPanelHeader: new KHE('kh-download-panel-header', '.'),
  downlaodPanelHeaderButtonGroup: new KHE('kh-download-panel-header-btn-group', '.'),
  downlaodPanelHeaderButton: new KHE('kh-download-panel-header-btn', '.'),
  downloadPanelHeaderTitle: new KHE('kh-download-panel-header-title', '.'),
  downloadPanelBody: new KHE('kh-download-panel-body', '.'),
  downloadPanelFooter: new KHE('kh-download-panel-footer', '.'),
  // End of Download Panel.
  // Download Item:
  downloadItemsList: new KHE('kh-download-items-list', '.'),
  downloadItem: new KHE('kh-download-item', '.'),
  downloadItemThumbnailWrapper: new KHE('kh-download-item-thumb-wrapper', '.'),
  downloadItemThumbnail: new KHE('kh-download-item-thumb', '.'),
  downloadItemInfoWrapper: new KHE('kh-download-item-info-wrapper', '.'),
  downloadItemName: new KHE('kh-download-item-info-name', '.'),
  downloadItemStatusWrapper: new KHE('kh-download-item-status-wrapper', '.'),
  downloadItemStatusProgressBar: new KHE('kh-download-item-status-progress', '.'),
  downloadItemStatusStatistics: new KHE('kh-download-item-status-statistics', '.'),
  // End of Download Item.
}
// End of Kemono Helper Elements.
// *****************************************************************

// Inject stylesheets:
const styles = `
/* Align the footer content to the left. */
footer.global-footer {
  &>dl {
    width: fit-content;
    text-align: start;
  }
  &>.footer {
    width: fit-content;
  }
}
/* Align inserted elements with existing elements. */
.post__actions {
  align-items: baseline;
}
/* Styles for the inserted elements. */
.kh-btn {
  background-color: transparent;
  border: none;
  color: rgb(237, 169, 62);

  &:not(:is([disabled])):hover {
    text-decoration: underline;
  }
  &:not(:is([disabled])):active {
    color: rgb(206, 119, 168);
  }
  &:is([disabled]) {
    background: transparent;
    color: rgb(110, 110, 110);
  }
}
.kh-dropdown {
  background-color: rgb(59, 62, 68);
  border: 1px solid rgb(184, 168, 137);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: initial;
  padding: 0.75rem 0.25rem 0.5rem 0.25rem;
  position: absolute;
  transition: opacity 400ms, visibility 400ms;

  &>.kh-btn {
    text-align: start;
  }
}
.kh-hide {
  opacity: 0;
  visibility: hidden;
}
/*******************************************************************/
/* Download Panel: */
${khe.downloadPanelWrapper} {
  position: fixed;
  bottom: 2px;
  left: calc(50% - 350px);
  /* Prevent the post links crossing the panel on user's page. */
  z-index: 999;
}
${khe.downloadPanel} {
  background-color: var(--color1-secondary-transparent);
  border: 1px solid var(--color0-tertirary);
  display: flex;
  flex-direction: column;
  height: 500px;
  width: 700px;
  transition:
  height 200ms,
  width 200ms;

  &.collapse {
    height: 2rem;
    overflow: hidden;
  }

  &.hide {
    display: none;
  }
}
${khe.downloadPanelHeader} {
  background-color: var(--color1-primary-transparent);
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.25rem;
}
${khe.downlaodPanelHeaderButton} {
  background: none;
  border: none;
  color: var(--color0-primary);
  cursor: pointer;
}
${khe.downloadPanelHeaderTitle} {
  margin: 0;
  padding: 0;
}
${khe.downloadPanelBody} {
  background-color: var(--color1-secondary-transparent);
  padding: 0.25rem;
  height: 100%;
  width: 100%;
  overflow-y: auto;
}
/* End of Download Panel. */
/*******************************************************************/
/* Download Item: */
${khe.downloadItemsList} {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
${khe.downloadItem} {
  background-color: var(--color1-primary);
  display: flex;
  flex-direction: row;
  gap: 0.25rem;
  padding: 0.25rem;

  &:hover {
    background-color: var(--color1-secondary);
  }

  &.fail {
    background-color: rgb(91, 33, 44);
  }
}
${khe.downloadItemThumbnailWrapper} {
  height: 120px;
  min-height: 120px;
  max-height: 120px;
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  align-content: center;
  text-align: center;
}
${khe.downloadItemThumbnail} {
  max-height: 100%;
  max-width: 100%;
  object-fit: scale-down;
}
${khe.downloadItemInfoWrapper} {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
}
${khe.downloadItemName} {
  margin: 0;
  padding: 0;
}
${khe.downloadItemStatusWrapper} {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
${khe.downloadItemStatusProgressBar} {
  width: 60%;
}
${khe.downloadItemStatusStatistics} {
  margin: 0;
  padding: 0;
}
/* End of Download Item. */
/*******************************************************************/
`;
GM_addStyle(styles);

onUrlChange();

if (self.navigation) {
  // When "navigatesuccess" event fires,
  // the "location" has not updated.
  // So use "currententrychange" instead.
  navigation.addEventListener('currententrychange', onUrlChange);
} else {
  let u = location.href;
  new MutationObserver(() => u !== (u = location.href) && onUrlChange()).observe(document, { subtree: true, childList: true });
}

function onUrlChange() {
  // The url of post looks like this: "/<SOURCE>/user/<UID>/post/<PID>".
  const re = /^\/\w*\/user\/\d*\/post\/\d*$/
  if (!re.test(location.pathname)) {
    return;
  }
  console.log('%s started.', SCRIPT_NAME);
  // Observe page changes:
  new MutationObserver((changes, observer) => {
    attachAdditionalActionButtonsThenDisconnect(observer);
  }).observe(document, { subtree: true, childList: true });
}

function attachAdditionalActionButtonsThenDisconnect(observer) {
  // Wait until the page actions were loaded.
  const _targetNode = document.querySelector('.post__actions>dialog');
  if (_targetNode === null) {
    return;
  }
  let actionsNode = document.querySelector('.post__actions');
  // Wrap action button and dropdown panel.
  let wrapper1 = GM_addElement(actionsNode, 'div', { class: 'kh-wrapper' });
  let action1 = GM_addElement(wrapper1, 'button', {
    id: 'kh-action1',
    class: 'kh-btn',
    textContent: '🖿Attachments',
    title: 'Download post attachments',
  });
  action1.onclick = () => dropdown1.classList.toggle('kh-hide');
  let dropdown1 = GM_addElement(wrapper1, 'div', {
    id: 'kh-dropdown1',
    class: 'kh-dropdown kh-hide',
  });
  let act1 = GM_addElement(dropdown1, 'button', {
    id: 'kh-act1',
    class: 'kh-btn',
    textContent: '🖹Copy links for aria2'
  });
  act1.onclick = copyAttachmentsLinksForAria2;

  let wrapper2 = GM_addElement(actionsNode, 'div', { class: 'kh-wrapper' });
  let action2 = GM_addElement(wrapper2, 'button', {
    id: 'kh-action2',
    class: 'kh-btn',
    textContent: '🖼Files',
    title: 'Download post files',
  });
  action2.onclick = () => dropdown2.classList.toggle('kh-hide');
  let dropdown2 = GM_addElement(wrapper2, 'div', {
    id: 'kh-dropdown2',
    class: 'kh-dropdown kh-hide',
  });
  let act3 = GM_addElement(dropdown2, 'button', {
    id: 'kh-act3',
    class: 'kh-btn',
    textContent: '🖹Copy links for aria2'
  });
  act3.onclick = copyFilesLinksForAria2;
  let act4 = GM_addElement(dropdown2, 'button', {
    id: 'kh-act4',
    class: 'kh-btn',
    textContent: '⬇Download all'
  });
  // Disable button for 3s when clicked.
  act4.onclick = (ev) => {
    ev.target.setAttribute('disabled', true);
    setTimeout(() => {
      ev.target.removeAttribute('disabled');
    }, 3000);
    tryFiles();
  };

  let act5 = GM_addElement(dropdown2, 'button', {
    id: 'kh-act5',
    class: 'kh-btn',
    textContent: '⚒Build',
  });
  act5.onclick = () => {
    const files = tryGetPostFiles();
    if (files.length > 0) {
      tryAddDownloadPanel();
    }
    const downloadItemWrapper = document.querySelector(khe.downloadItemsList.selector);
    for (const file of files) {
      addDownloadItemToWrapperWithFile(downloadItemWrapper, file);
    }
  };

  // All done, disconnect the observer.
  observer.disconnect();
}

function addDownloadItemToWrapperWithFile(downloadItemWrapper, file) {
  let downloadItem = GM_addElement(downloadItemWrapper, 'div', {
    id: `kh-download-item-${file.checksum}`,
    class: khe.downloadItem.name,
  });
  let thumbnailWrapper = GM_addElement(downloadItem, 'div', {
    class: khe.downloadItemThumbnailWrapper.name,
  });
  // Thumbnail:
  GM_addElement(thumbnailWrapper, 'img', {
    class: khe.downloadItemThumbnail.name,
    src: file.thumbUrl,
    alt: file.shortName,
    loading: 'lazy',
  });
  let itemInfoWrapper = GM_addElement(downloadItem, 'div', {
    class: khe.downloadItemInfoWrapper.name,
  });
  // Item Name:
  GM_addElement(itemInfoWrapper, 'p', {
    class: khe.downloadItemName.name,
    textContent: file.name,
  });
  let itemStatusWrapper = GM_addElement(itemInfoWrapper, 'div', {
    class: khe.downloadItemStatusWrapper.name,
  });
  // Progress Bar:
  let downloadProgress = GM_addElement(itemStatusWrapper, 'progress', {
    class: khe.downloadItemStatusProgressBar.name,
  });
  // Statistics:
  let downloadStatistics = GM_addElement(itemStatusWrapper, 'p', {
    class: khe.downloadItemStatusStatistics.name,
    textContent: 'Pending...'
  });
  // Download file:
  let downloadControl = GM_download({
    url: file.url,
    name: file.name,
    onabort: (ev) => {
      downloadProgress.value = 0;
      downloadStatistics.innerText = 'Cancelled';
    },
    onerror: (ev) => {
      downloadItem.classList.toggle('fail', true);
      downloadStatistics.innerText = 'Error';
    },
    onload: (ev) => {
      if (ev.status === 200) {
        // success
      } else {
        // abort
        downloadControl.abort();
        downloadItem.classList.toggle('fail', true);
        downloadStatistics.innerText = 'Fail';
      }
    },
    onloadstart: (ev) => {
      downloadProgress.value = 0;
      downloadStatistics.innerText = 'Starting...';
    },
    onprogress: (ev) => {
      if (ev.lengthComputable) {
        let loaded = ev.loaded;
        let total = ev.total;
        downloadProgress.value = loaded;
        downloadProgress.max = total;
        downloadStatistics.innerText = `${humanReadableSize(loaded)}/${humanReadableSize(total)}`;
      } else {
        // length not computable
        downloadStatistics.innerText = 'Downloading...';
      }
    },
  });
}

function humanReadableSize(bytes) {
  let result = bytes;
  if (bytes < 1024) {
    return `${result}B`;
  } else if ((result = bytes >> 10) < 1024) {
    return `${result}K`;
  } else if ((result = bytes >> 20) < 1024) {
    return `${result}M`;
  } else {
    result = bytes >> 30;
    return `${result}G`;
  }
}

function tryAddDownloadPanel() {
  const targetNode = document.querySelector('#root');
  const _panel = document.querySelector(khe.downloadPanel.selector);
  if (targetNode === null) {
    console.error('%s: Could not create download panel, the targetNode is null.', SCRIPT_NAME);
    return;
  } else if (_panel) {
    // The download panel already exists, make it visible.
    _panel.classList.toggle('hide', false);
    return;
  }
  let downloadPanelWrapper = GM_addElement(targetNode, 'div', {
    class: khe.downloadPanelWrapper.name,
  });
  let downloadPanel = GM_addElement(downloadPanelWrapper, 'div', {
    id: khe.downloadPanel.name,
    class: `${khe.downloadPanel.name}`,
  });

  // Panel header:
  let downloadPanelHeader = GM_addElement(downloadPanel, 'div', {
    class: khe.downloadPanelHeader.name,
  });
  let downloadPanelHeaderButtonGroup1 = GM_addElement(downloadPanelHeader, 'div', {
    class: khe.downlaodPanelHeaderButtonGroup.name,
  });
  let downloadPanelHideButton = GM_addElement(downloadPanelHeaderButtonGroup1, 'button', {
    id: `${khe.downlaodPanelHeaderButton}-hide`,
    class: khe.downlaodPanelHeaderButton.name,
    textContent: '⛌',
  });
  downloadPanelHideButton.onclick = () => {
    hideDownloadPanel(downloadPanel);
  }
  // Panel Title:
  GM_addElement(downloadPanelHeader, 'p', {
    class: khe.downloadPanelHeaderTitle.name,
    textContent: 'Downloads',
  });
  let downloadPanelHeaderButtonGroup2 = GM_addElement(downloadPanelHeader, 'div', {
    class: khe.downlaodPanelHeaderButtonGroup.name,
  });
  let downloadPanelToggleButton = GM_addElement(downloadPanelHeaderButtonGroup2, 'button', {
    id: `${khe.downlaodPanelHeaderButton.name}-toggle`,
    class: khe.downlaodPanelHeaderButton.name,
    textContent: '▼',
  });
  downloadPanelToggleButton.onclick = (ev) => {
    toggleDownloadPanel(downloadPanel, ev.target);
  }
  // End of panel header.

  let downloadPanelBody = GM_addElement(downloadPanel, 'div', {
    class: khe.downloadPanelBody.name,
  });
  // Download Item Wrapper:
  GM_addElement(downloadPanelBody, 'div', {
    id: khe.downloadItemsList.name,
    class: khe.downloadItemsList.name,
  });
}

function hideDownloadPanel(panel) {
  panel.classList.toggle('hide', true);
}

function toggleDownloadPanel(panel, toggleButton) {
  panel.classList.toggle('collapse');
  if (panel.classList.contains('collapse')) {
    toggleButton.innerText = '▲';
  } else {
    toggleButton.innerText = '▼';
  }
}

function getMetaData() {
  const userName = document.querySelector('.post__user-name').innerText;
  // The name of the post may contain '/', replace them with '|':
  const postName = document.querySelector('.post__title').innerText.replaceAll('/', '|');
  // "2006-01-02" -> "2006.01.02":
  const publishDate = document.querySelector('.post__published>.timestamp').innerText.replaceAll('-', '.');

  return { userName, postName, publishDate };
}

// Attachments:
function copyAttachmentsLinksForAria2() {
  let attachmentsNode = document.querySelector('.post__attachments');
  if (attachmentsNode === null || !attachmentsNode.hasChildNodes()) {
    GM_notification({
      title: SCRIPT_NAME,
      text: 'No attachments.',
      tag: 'kh-attachments-aria2',
    });
    return;
  }
  let aria2Links = [];
  const { userName, postName, publishDate } = getMetaData();
  const attachmentLinkNodes = document.querySelectorAll('a.post__attachment-link');
  for (const attachmentLinkNode of attachmentLinkNodes) {
    // A download link looks like:
    // "https://<HOST>/data/<SUM_HEAD1>/<SUM_HEAD2>/<CHECKSUM>.<MIMETYPE>?f=<NAME_URLENCODED>.<MIMETYPE>"
    const re = /^(https:\/\/.*\/data\/\w{2}\/\w{2}\/(\w*)\.\w*)\?.*$/;
    const _matches = attachmentLinkNode.href.match(re);
    // _matches:
    // [0]: The whole url
    // [1]: The download link without params
    // [2]: The checksum
    const url = _matches[1];
    const checksum = _matches[2];
    // Though the parameter "f" in the download link indicates the name of the attachment,
    // it was not readable for human, because those non-ASCII characters were encoded.
    // Use the value of "download" attribute as the name instead.
    const fileName = attachmentLinkNode.download;
    // Construct link for aria2:
    const aria2Link = `\n${url}\n out=${fileName}\n checksum=sha-256=${checksum}\n dir=${userName}/[${publishDate}]${postName}\n`;
    aria2Links.push(aria2Link);
  }
  // Copy links to the clipboard, then pop up a notification.
  const _links = aria2Links.join('');
  GM_setClipboard(_links);
  GM_notification({
    title: SCRIPT_NAME,
    text: 'Download links of attachments for Aria2 was successfully copied to the clipboard!',
    tag: 'kh-attachments-aria2',
  });
}

// Files:
function copyFilesLinksForAria2() {
  let filesNode = document.querySelector('.post__files');
  if (filesNode === null || !filesNode.hasChildNodes()) {
    GM_notification({
      title: SCRIPT_NAME,
      text: 'No files.',
      tag: 'kh-files-aria2',
    });
    return;
  }
  let aria2Links = [];
  const { userName, postName, publishDate } = getMetaData();
  const fileLinkNodes = document.querySelectorAll('a.fileThumb');
  for (let i = 0; i < fileLinkNodes.length; i++) {
    const fileLinkNode = fileLinkNodes[i];
    const re = /^(https:\/\/.*\/data\/\w{2}\/\w{2}\/(\w*)\.(\w*))\?.*$/;
    const _matches = fileLinkNode.href.match(re);
    // _matches:
    // [0]: The whole url
    // [1]: The download link without params
    // [2]: The checksum
    // [3]: The mimetype
    const url = _matches[1];
    const checksum = _matches[2];
    // Because the attribute "download" could be uuid, md5 or something else,
    // use it as a file name is not helpful for management.
    // Names such as "1.png", "2.jpg" etc. are good,
    // since all the files in this post will be saved into a folder named after the name of the post.
    const fileName = `${i}.${_matches[3]}`;
    const aria2Link = `\n${url}\n out=${fileName}\n checksum=sha-256=${checksum}\n dir=${userName}/[${publishDate}]${postName}\n`;
    aria2Links.push(aria2Link);
  }
  // Copy links to the clipboard, then pop up a notification.
  const _links = aria2Links.join('');
  GM_setClipboard(_links);
  GM_notification({
    title: SCRIPT_NAME,
    text: 'Download links of files for Aria2 was successfully copied to the clipboard!',
    tag: 'kh-files-aria2',
  });
}


function tryGetPostFiles() {
  let filesNode = document.querySelector('.post__files');
  if (filesNode === null || !filesNode.hasChildNodes()) {
    return [];
  }
  let files = [];
  const { userName, postName, publishDate } = getMetaData();
  const fileLinkNodes = document.querySelectorAll('a.fileThumb');
  for (let i = 0; i < fileLinkNodes.length; i++) {
    const fileLinkNode = fileLinkNodes[i];
    const fileThumbNode = fileLinkNode.children[0];
    const re = /^(https:\/\/.*\/data\/\w{2}\/\w{2}\/(\w*)\.(\w*))\?.*$/;
    const matches = fileLinkNode.href.match(re);
    // _matches:
    // [0]: The whole url
    // [1]: The download link without params
    // [2]: The checksum
    // [3]: The mimetype
    const url = matches[1];
    const checksum = matches[2];
    // Because the attribute "download" could be uuid, md5 or something else,
    // use it as a file name is not helpful for management.
    // Names such as "1.png", "2.jpg" etc. are good,
    // since all the files in this post will be saved into a folder named after the name of the post.
    const fileName = `${i}.${matches[3]}`;
    let file = {
      url: url,
      name: `${userName}-[${publishDate}]${postName}-${fileName}`,
      checksum: checksum,
      mimetype: matches[3],
      shortName: fileName,
      thumbUrl: fileThumbNode.src,
    };
    files.push(file);
  }
  return files;
}

function tryFiles() {
  let filesNode = document.querySelector('.post__files');
  if (filesNode === null || !filesNode.hasChildNodes()) {
    GM_notification({
      title: SCRIPT_NAME,
      text: 'No files.',
      tag: 'kh-files-download',
    });
    return;
  }
  let files = [];
  const { userName, postName, publishDate } = getMetaData();
  const fileLinkNodes = document.querySelectorAll('a.fileThumb');
  for (let i = 0; i < fileLinkNodes.length; i++) {
    const fileLinkNode = fileLinkNodes[i];
    const re = /^(https:\/\/.*\/data\/\w{2}\/\w{2}\/(\w*)\.(\w*))\?.*$/;
    const _matches = fileLinkNode.href.match(re);
    // _matches:
    // [0]: The whole url
    // [1]: The download link without params
    // [2]: The checksum
    // [3]: The mimetype
    const url = _matches[1];
    // Because the attribute "download" could be uuid, md5 or something else,
    // use it as a file name is not helpful for management.
    // Names such as "1.png", "2.jpg" etc. are good,
    // since all the files in this post will be saved into a folder named after the name of the post.
    const fileName = `${i}.${_matches[3]}`;
    let file = { url, name: `${userName}-[${publishDate}]${postName}-${fileName}` };
    files.push(file);
  }
  const count = files.length;
  for (let j = 0; j < count; j++) {
    const { url, name } = files[j];
    GM_notification({
      title: SCRIPT_NAME,
      text: `Downloading ${name}\n(${j + 1}/${count})`,
      tag: `kh-files-download-start-${j}`,
    });
    let downloadControl = GM_download({
      url: url,
      name: name,
      onload: (ev) => {
        if (ev.status >= 400) {
          downloadControl.abort();
          GM_notification({
            title: SCRIPT_NAME,
            text: `${name} was failed: (${ev.status})`,
            tag: `kh-files-download-abort-${j}`,
          });
          return;
        }
        GM_notification({
          title: SCRIPT_NAME,
          text: `${name} was completed`,
          tag: `kh-files-download-success-${j}`,
        });
      }, // onload callback
      onerror: () => {
        GM_notification({
          title: SCRIPT_NAME,
          text: `${name} was failed`,
          tag: `kh-files-download-fail-${j}`,
        });
      }, // onerror callback
    }); // GM_download()
  } // for loop
}

// Hide all displaying dropdown panels when not clicked.
self.addEventListener('click', (ev) => {
  const wrappers = document.querySelectorAll('.kh-wrapper');
  if (wrappers && wrappers.length > 0) {
    for (const wrapper of wrappers) {
      // Hide the panels only when not clicked inside the wrapper.
      if (!wrapper.contains(ev.target)) {
        const dropdown = wrapper.children[1];
        dropdown.classList.toggle('kh-hide', true);
      }
    }
  }
});
