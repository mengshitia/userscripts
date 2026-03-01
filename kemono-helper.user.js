// ==UserScript==
// @name                  kemono helper
// @name:zh-CN            kemono 小帮手
// @namespace             https://github.com/mengshitia/userscripts
// @description           Make downloading contents easier.
// @version               1.2
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

// Inject stylesheets:
GM_addStyle(`
.post__actions {
  align-items: baseline;
}
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
`);

onUrlChange();

if (self.navigation) {
  // When "navigatesuccess" event fires,
  // the "location" has not updated.
  // So use "currententrychange" instead.
  navigation.addEventListener('currententrychange', onUrlChange);
} else {
  let u = location.href;
  new MutationObserver(() => u !== (u = location.href) && onUrlChange()).observe(document, {subtree: true, childList: true});
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
  }).observe(document, {subtree: true, childList: true});
}

function attachAdditionalActionButtonsThenDisconnect(observer) {
  let actionsNode = document.querySelector('.post__actions');
  if (actionsNode === null) {
    return;
  }
  // Wrap action button and dropdown panel.
  let wrapper1 = GM_addElement(actionsNode, 'div', {class: 'kh-wrapper'});
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
  let act2 = GM_addElement(dropdown1, 'button', {
    id: 'kh-act2',
    class: 'kh-btn',
    textContent: '⬇Download all'
  });
  // Disable button for 3s when clicked.
  act2.onclick = (ev) => {
    ev.target.setAttribute('disabled', true);
    setTimeout(() => {
      ev.target.removeAttribute('disabled');
    }, 3000);
    tryAttachments();
  };

  let wrapper2 = GM_addElement(actionsNode, 'div', {class: 'kh-wrapper'});
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
    },3000);
    tryFiles();
  };

  // All done, disconnect the observer.
  observer.disconnect();
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

function tryAttachments() {
  let attachmentsNode = document.querySelector('.post__attachments');
  if (attachmentsNode === null || !attachmentsNode.hasChildNodes()) {
    GM_notification({
      title: SCRIPT_NAME,
      text: 'No attachments.',
      tag: 'kh-attachments-download',
    });
    return;
  }
  let attachments = [];
  const { userName, postName, publishDate } = getMetaData();
  const attachmentLinkNodes = document.querySelectorAll('.post__attachment-link');
  for (const attachmentLinkNode of attachmentLinkNodes) {
    const url = attachmentLinkNode.href;
    const fileName = attachmentLinkNode.download;
    let file = {url, name: `${userName}-[${publishDate}]${postName}-${fileName}`};
    attachments.push(file);
  }
  // Download one by one.
  const count = attachments.length;
  for (let i = 0; i < count; i++) {
    const {url, name} = attachments[i];
    GM_notification({
      title: SCRIPT_NAME,
      text: `Downloading ${name}\n(${i+1}/${count})`,
      tag: `kh-attachments-download-start-${j}`,
    });
    GM_download({
      url: url,
      name: name,
      onload: () => {
        GM_notification({
          title: SCRIPT_NAME,
          text: `${name} was completed`,
          tag: `kh-attachments-download-success-${i}`,
        });
      }, // onload callback
      onerror: () => {
        GM_notification({
          title: SCRIPT_NAME,
          text: `${name} was failed`,
          tag: `kh-attachments-download-fail-${i}`,
        });
      }, // onerror callback
    }); // GM_download()
  } // for loop
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
    let file = {url, name: `${userName}-[${publishDate}]${postName}-${fileName}`};
    files.push(file);
  }
  const count = files.length;
  for (let j = 0; j < count; j++) {
    const {url, name} = files[j];
    GM_notification({
      title: SCRIPT_NAME,
      text: `Downloading ${name}\n(${j+1}/${count})`,
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
