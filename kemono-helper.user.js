// ==UserScript==
// @name                  kemono helper
// @name:zh-CN            kemono 小帮手
// @namespace             https://github.com/mengshitia/userscripts
// @description           Make downloading contents easier.
// @version               1.3b.1
// @match                 https://kemono.*/*
// @grant                 GM_info
// @grant                 GM_addElement
// @grant                 GM_addStyle
// @grant                 GM_notification
// @grant                 GM_setClipboard
// @grant                 GM_download
// @run-at                document-end
// ==/UserScript==


/*****************************************
 * Script Info.
 */
const si = Object.freeze({
  name: GM_info.script.name,
}); // End of Script Info.

/*****************************************
 * Common Selectors.
 */
const cs = Object.freeze({
  tweakTarget: '.post__actions>dialog',
  postActions: '.post__actions',
  userName: '.post__user-name',
  postName: '.post__title',
  publishDate: '.post__published>.timestamp',
  postAttachments: '.post__attachments',
  postAttachmentLink: 'a.post__attachment-link',
  postFiles: '.post__files',
  postFileLink: 'a.fileThumb',
  rootContainer: '#root',
}); // End of Common Selectors.

/*****************************************
 * Notification Tags.
 */
const nt = Object.freeze({
  copy: 'kh-nt-copy',
  downloadFail: 'kh-nt-download-fail',
}); // End of Notification Tags.


/*****************************************
 * Internationalization Keywords.
 */
const kw = Object.freeze({
  cancel: Symbol('cancel'),
  cancelled: Symbol('cancelled'),
  clearAll: Symbol('clearAll'),
  confirm: Symbol('confirm'),
  copyLinksForAria2: Symbol('copyLinksForAria2'),
  download: Symbol('download'),
  downloading: Symbol('downloading'),
  downloadPanel: Symbol('downloadPanel'),
  downloadPicturesInThisPost: Symbol('downloadPicturesInThisPost'),
  errorOccurred: Symbol('errorOccurred'),
  fileSelection: Symbol('fileSelection'),
  finished: Symbol('finished'),
  hideDownloadPanel: Symbol('hideDownloadPanel'),
  invertSelection: Symbol('invertSelection'),
  linksHaveBeenCopied: Symbol('linksHaveBeenCopied'),
  noAttachmentsFound: Symbol('noAttachmentsFound'),
  noFilesFound: Symbol('noFilesFound'),
  pending: Symbol('pending'),
  selectAll: Symbol('selectAll'),
  started: Symbol('started'),
  toggleDownloadPanel: Symbol('toggleDownloadPanel'),
  unknownSize: Symbol('unknownSize'),
}); // End of Internationalization Keywords.

/*****************************************
 * Keyword Language Map.
 */
const KEYWORD_LANGUAGE_MAP = _buildLanguageMap();
function _buildLanguageMap() {
  const map = {
    'en-US': {},
    'zh-CN': {},
  };
  let _enus = map['en-US'];
  let _zhcn = map['zh-CN'];
  // en-US:
  _enus[kw.cancel] = 'Cancel';
  _enus[kw.cancelled] = 'Cancelled';
  _enus[kw.clearAll] = 'Clear All';
  _enus[kw.confirm] = 'Confirm';
  _enus[kw.copyLinksForAria2] = 'Copy links for aria2';
  _enus[kw.download] = 'Download';
  _enus[kw.downloading] = 'Downloading';
  _enus[kw.downloadPanel] = 'Download Panel';
  _enus[kw.downloadPicturesInThisPost] = 'Download pictures in this post';
  _enus[kw.errorOccurred] = 'Error';
  _enus[kw.fileSelection] = 'Choose files to download';
  _enus[kw.finished] = 'Finished';
  _enus[kw.hideDownloadPanel] = 'Hide the download panel';
  _enus[kw.invertSelection] = 'Invert';
  _enus[kw.linksHaveBeenCopied] = 'Links have been copied';
  _enus[kw.noAttachmentsFound] = 'No attachments found';
  _enus[kw.noFilesFound] = 'No files found';
  _enus[kw.pending] = 'Pending';
  _enus[kw.selectAll] = 'Select All';
  _enus[kw.started] = 'Started';
  _enus[kw.toggleDownloadPanel] = 'Toggle the download panel';
  _enus[kw.unknownSize] = 'Unknown size';
  // zh-CN:
  _zhcn[kw.cancel] = '取消';
  _zhcn[kw.cancelled] = '已取消';
  _zhcn[kw.clearAll] = '清空';
  _zhcn[kw.confirm] = '确认';
  _zhcn[kw.copyLinksForAria2] = '复制 aria2 下载链接';
  _zhcn[kw.download] = '下载';
  _zhcn[kw.downloading] = '下载中';
  _zhcn[kw.downloadPanel] = '下载列表';
  _zhcn[kw.downloadPicturesInThisPost] = '下载此帖中的图片';
  _zhcn[kw.errorOccurred] = '发生错误';
  _zhcn[kw.fileSelection] = '选择要下载的文件';
  _zhcn[kw.finished] = '已完成';
  _zhcn[kw.invertSelection] = '反选';
  _zhcn[kw.hideDownloadPanel] = '隐藏下载列表';
  _zhcn[kw.linksHaveBeenCopied] = '链接已复制';
  _zhcn[kw.noAttachmentsFound] = '没有找到任何附件';
  _zhcn[kw.noFilesFound] = '没有找到任何文件';
  _zhcn[kw.pending] = '等待中';
  _zhcn[kw.selectAll] = '全选';
  _zhcn[kw.started] = '已开始';
  _zhcn[kw.toggleDownloadPanel] = '展开/折叠下载列表';
  _zhcn[kw.unknownSize] = '大小未知';

  return Object.freeze(map);
} // End of function _buildLanguageMap.
// End of Keyword Language Map.

/*****************************************
 * Translate a specific keyword.
 */
function i18n(keyword) {
  let preferredLanguage = navigator.language;
  // Fallback to default language if needed:
  if (!(preferredLanguage in KEYWORD_LANGUAGE_MAP)) {
    preferredLanguage = 'en-US';
  }
  if (keyword in KEYWORD_LANGUAGE_MAP[preferredLanguage]) {
    return KEYWORD_LANGUAGE_MAP[preferredLanguage][keyword];
  }
  console.warn('%s: Translation of "%s" was not found.', si.name, keyword);
  return keyword;
} // End of function i18n.

/*****************************************
 * class: Kemono Helper Element.
 */
class KHE {
  constructor(className, selectorPrefix) {
    this.name = className;
    this.selector = `${selectorPrefix}${className}`
  }
  toString() {
    return this.selector;
  }
} // End of class: Kemono Helper Element

/*****************************************
 * Kemono Helper Elements.
 */
const khe = Object.freeze({
  // Actions:
  actionWrapper: new KHE('kh-action-wrapper', '.'),
  actionButton: new KHE('kh-action-btn', '.'),
  actionPanel: new KHE('kh-action-panel', '.'),
  attachmentsActionsPanelToggleButton: new KHE('kh-action-panel-attachments-toggle', '#'),
  filesActionsPanelToggleButton: new KHE('kh-action-panel-files-toggle', '#'),
  // Download Panel:
  downloadPanelWrapper: new KHE('kh-download-panel-wrapper', '.'),
  downloadPanel: new KHE('kh-download-panel', '#'),
  downloadPanelToggleButton: new KHE('kh-download-panel-toggle', '#'),
  downloadPanelHideButton: new KHE('kh-download-pane-hide', '#'),
  downloadPanelHeader: new KHE('kh-download-panel-header', '.'),
  downloadPanelHeaderTitle: new KHE('kh-download-panel-header-title', '.'),
  downloadPanelHeaderButtonGroup: new KHE('kh-download-panel-header-btn-group', '.'),
  downloadPanelHeaderButton: new KHE('kh-download-panel-header-btn', '.'),
  downloadPanelBody: new KHE('kh-download-panel-body', '.'),
  downloadPanelFooter: new KHE('kh-download-panel-footer', '.'),
  // Download Item:
  downloadItemsList: new KHE('kh-download-items-list', '.'),
  downloadItem: new KHE('kh-download-item', '.'),
  downloadItemInfoWrapper: new KHE('kh-download-item-info-wrapper', '.'),
  downloadItemName: new KHE('kh-download-item-info-name', '.'),
  downloadItemStatusWrapper: new KHE('kh-download-item-status-wrapper', '.'),
  downloadItemStatusProgressBar: new KHE('kh-download-item-status-progress', '.'),
  downloadItemStatusStatistics: new KHE('kh-download-item-status-statistics', '.'),
  // File Picker:
  filePicker: new KHE('kh-file-picker', '.'),
  filePickerHeader: new KHE('kh-file-picker-header', '.'),
  filePickerTitle: new KHE('kh-file-picker-title', '.'),
  filePickerBody: new KHE('kh-file-picker-body', '.'),
  fileList: new KHE('kh-file-list', '#'),
  fileListItem: new KHE('kh-file-item', '.'),
  fileListItemCheckbox: new KHE('kh-file-item-checkbox', '.'),
  fileListItemLabel: new KHE('kh-file-item-label', '.'),
  filePickerFooter: new KHE('kh-file-picker-footer', '.'),
  filePickerActionWrapper: new KHE('kh-file-picker-action-wrapper', '.'),
  filePickerActionSelectAllButton: new KHE('kh-file-picker-action-select-all-btn', '#'),
  filePickerActionClearAllButton: new KHE('kh-file-picker-action-clear-all-btn', '#'),
  filePickerActionInvertSelectionButton: new KHE('kh-file-picker-action-invert-selection-btn', '#'),
  filePickerActionSubmitButton: new KHE('kh-file-picker-action-submit-btn', '#'),
  filePickerActionCancelButton: new KHE('kh-file-picker-action-cancel-btn', '#'),
  // File Thumbnail:
  fileThumbnailWrapper: new KHE('kh-download-item-thumb-wrapper', '.'),
  fileThumbnail: new KHE('kh-download-item-thumb', '.'),
}); // End of Kemono Helper Elements.

/*****************************************
 * Customized Styles:
 */
GM_addStyle(`
/*****************************************
 * Override existing styles:
 ****************************************/
/* Move the footer content to the left. */
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
/*****************************************
 * Kemono Helper Elements Styles:
 ****************************************/
/** Actions: **/
${khe.actionButton} {
  background: none;
  border: none;
  color: var(--color0-primary);
  padding: 0.25rem;

  &:not(:is([disabled])):hover {
    background-color: var(--color0-tertirary);
  }

  &:is([disabled]) {
    background: none;
  }
}
${khe.actionPanel} {
  background-color: var(--color1-secondary);
  border: 1px solid var(--color0-tertirary);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 1.25rem;
  padding: 0.25rem;
  position: absolute;

  &.hide {
    display: none;
  }

  &>${khe.actionButton} {
    text-align: start;
  }
}
/** Download Panel: **/
${khe.downloadPanelWrapper} {
  position: fixed;
  bottom: 2px;
  left: calc(50% - 17vw);
  /* Prevent the post links crossing the panel on user's page. */
  z-index: 999;
}
${khe.downloadPanel} {
  background-color: var(--color1-secondary-transparent);
  border: 1px solid var(--color0-tertirary);
  display: flex;
  flex-direction: column;
  height: 30vh;
  width: 34vw;
  transition:
  height 200ms,
  width 200ms;

  &.collapse {
    height: 1.5rem;
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
  justify-content: center;
  align-items: baseline;
  position: relative;
  line-height: 1.5;
}
${khe.downloadPanelHeaderButtonGroup} {
  position: absolute;
  height: 100%;
  width: 100%;
}
${khe.downloadPanelHeaderButton} {
  background: none;
  border: none;
  color: var(--color0-primary);
  cursor: pointer;
}
${khe.downloadPanelToggleButton} {
  position: absolute;
  height: 100%;
  width: 100%;
  padding: 0;
}
${khe.downloadPanelHideButton} {
  position: absolute;
  padding: 0;
  height: 1.5rem;
  width: 1.5rem;

  &:hover {
    background-color: var(--color0-primary);
    color: var(--color1-primary);
  }
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
/** Download Item: **/
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
/** File Picker: **/
${khe.filePicker}:is([open]) {
  background-color: var(--color1-primary);
  border: 2px solid var(--color0-tertirary);
  color: var(--color0-primary);
  display: flex;
  flex-direction: column;
  height: 33vw;
  width: 47vw;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 0;

  &::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }
}
${khe.filePickerHeader} {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: baseline;
  padding: 0.5rem;
}
${khe.filePickerTitle} {
  margin: 0;
  padding: 0;
}
${khe.filePickerBody} {
  padding: 0.5rem;
  height: 100%;
  overflow-y: auto;
}
${khe.fileList} {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}
${khe.fileListItem} {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
}
${khe.filePickerFooter} {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 0.5rem;
}
${khe.filePickerActionWrapper} {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 0.5rem;
}
/** Thumbnail: **/
${khe.fileThumbnailWrapper} {
  height: 120px;
  min-height: 120px;
  max-height: 120px;
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  align-content: center;
  text-align: center;
}
${khe.fileThumbnail} {
  max-height: 100%;
  max-width: 100%;
  object-fit: scale-down;
}
/* End of Kemono Helper Elements Styles. */
`); // End of Customized Styles.


// *****************************************************************
// Observing url changes:
// *****************************************************************
// For SPA sites, use either "Navigation" or "MutationObserver".
// "Navitgation": Chrome >= 102, Firefox >= 147.
if (self.navigation) {
  // Use "currententrychange" instead of "navigatesuccess" event.
  navigation.addEventListener('currententrychange', onUrlChange);
} else {
  let u = location.href;
  const callback = () => u !== (u = location.href) && onUrlChange();
  const options = { subtree: true, childList: true };
  new MutationObserver(callback).observe(document, options);
}
// What to do when the url changes:
function onUrlChange() {
  // Executing tweaks only on matched url.
  // The location.pathname: "/<WHERE>/user/<UID>/post/<PID>".
  const re = /^\/.+?\/user\/\d+\/post\/\d+$/;
  if (re.test(location.pathname)) {
    const options = { subtree: true, childList: true };
    new MutationObserver(tweak).observe(document, options);
  }
}
// Also when current page was loaded:
onUrlChange();
// *****************************************************************
// End of Observing url changes.
// *****************************************************************


// *****************************************************************
// Tweaks:
// *****************************************************************
function tweak(changes, observer) {
  // Wait until the target element was created:
  const targetNode = document.querySelector(cs.tweakTarget);
  if (targetNode) {
    // Stop on error.
    try {
      console.log('%s: Up and running.', si.name);
      createAdditionalActions();
    } catch (e) {
      console.error('%s: Error occurred.', si.name);
      throw e;
    } finally {
      console.log('%s: Stopped.', si.name);
      observer.disconnect();
    }
  }
}

function createAdditionalActions() {
  // If actions have been created, quit.
  const _apb = document.querySelector(khe.attachmentsActionsPanelToggleButton.selector);
  const _fpb = document.querySelector(khe.filesActionsPanelToggleButton.selector);
  if (_apb || _fpb) {
    return;
  }
  const postActions = document.querySelector(cs.postActions);
  // * Attachments Actions:
  let attachmentsActionsWrapper = GM_addElement(postActions, 'div', {
    class: khe.actionWrapper.name,
  });
  let attachmentsActionsPanelToggleButton = GM_addElement(attachmentsActionsWrapper, 'button', {
    class: khe.actionButton.name,
    id: khe.attachmentsActionsPanelToggleButton.name,
    textContent: '🖿Attachments',
  });
  let attachmentsActionsPanel = GM_addElement(attachmentsActionsWrapper, 'div', {
    class: `${khe.actionPanel.name} hide`,
  });
  let copyAttachmentsLinksForAria2ActionButton = GM_addElement(attachmentsActionsPanel, 'button', {
    class: khe.actionButton.name,
    textContent: `🖹${i18n(kw.copyLinksForAria2)}`,
  });
  // Events:
  attachmentsActionsPanelToggleButton.onclick = () => {
    attachmentsActionsPanel.classList.toggle('hide');
  };
  attachmentsActionsPanel.onclick = (ev) => {
    ev.stopPropagation();
  };
  copyAttachmentsLinksForAria2ActionButton.onclick = (ev) => {
    ev.stopPropagation();
    attachmentsActionsPanel.classList.toggle('hide', true);
    let attachments = tryGetPostAttachments();
    if (attachments.length > 0) {
      const { userName, postName, publishDate } = tryGetMetadata();
      let aria2Links = [];
      for (const a of attachments) {
        const aria2Link = `\n${a.url}\n out=${a.name}\n checksum=sha-256=${a.checksum}\n dir=${userName}/[${publishDate}]${postName}\n`;
        aria2Links.push(aria2Link);
      }
      const links = aria2Links.join('');
      GM_setClipboard(links);
      GM_notification({
        title: si.name,
        tag: nt.copy,
        text: i18n(kw.linksHaveBeenCopied),
      });
    } else {
      GM_notification({
        title: si.name,
        tag: nt.copy,
        text: i18n(kw.noAttachmentsFound),
      });
    }
  };
  // * End of Attachments Actions.
  // * Files Actions:
  let filesActionsWrapper = GM_addElement(postActions, 'div', {
    class: khe.actionWrapper.name,
  });
  let filesActionsPanelToggleButton = GM_addElement(filesActionsWrapper, 'button', {
    class: khe.actionButton.name,
    id: khe.filesActionsPanelToggleButton.name,
    textContent: '🖼Files',
  });
  let filesActionsPanel = GM_addElement(filesActionsWrapper, 'div', {
    class: `${khe.actionPanel.name} hide`,
  });
  let copyFilesLinksForAria2ActionButton = GM_addElement(filesActionsPanel, 'button', {
    class: khe.actionButton.name,
    textContent: `🖹${i18n(kw.copyLinksForAria2)}`,
  });
  let downloadFilesActionButton = GM_addElement(filesActionsPanel, 'button', {
    class: khe.actionButton.name,
    textContent: `⬇${i18n(kw.download)}`,
    title: `${i18n(kw.downloadPicturesInThisPost)}`,
  });
  let testActionButton = GM_addElement(filesActionsPanel, 'button', {
    class: khe.actionButton.name,
    textContent: '⚒Tests',
  });
  // Events:
  filesActionsPanelToggleButton.onclick = () => {
    filesActionsPanel.classList.toggle('hide');
  };
  filesActionsPanel.onclick = (ev) => {
    ev.stopPropagation();
  };
  copyFilesLinksForAria2ActionButton.onclick = (ev) => {
    ev.stopPropagation();
    filesActionsPanel.classList.toggle('hide', true);
    let files = tryGetPostFiles();
    if (files.length > 0) {
      const { userName, postName, publishDate } = tryGetMetadata();
      let aria2Links = [];
      for (const f of files) {
        const aria2Link = `\n${f.url}\n out=${f.shortName}\n checksum=sha-256=${f.checksum}\n dir=${userName}/[${publishDate}]${postName}\n`;
        aria2Links.push(aria2Link);
      }
      const links = aria2Links.join('');
      GM_setClipboard(links);
      GM_notification({
        title: si.name,
        tag: nt.copy,
        text: i18n(kw.linksHaveBeenCopied),
      });
    } else {
      GM_notification({
        title: si.name,
        tag: nt.copy,
        text: i18n(kw.noFilesFound),
      });
    }
  };
  downloadFilesActionButton.onclick = (ev) => {
    ev.stopPropagation();
    filesActionsPanel.classList.toggle('hide', true);
    createOrDisplayFilePicker();
  };
  // * End of Files Actions.
} // End of function createAdditionalActions.

function createOrDisplayFilePicker() {
  let filePicker = document.querySelector(khe.filePicker.selector);
  if (filePicker) {
    filePicker.showModal();
  } else {
    const container = document.querySelector(cs.postActions);
    filePicker = GM_addElement(container, 'dialog', {
      class: khe.filePicker.name,
    });
    let filePickerHeader = GM_addElement(filePicker, 'header', {
      class: khe.filePickerHeader.name,
    });
    let filePickerTitle = GM_addElement(filePickerHeader, 'h2', {
      class: khe.filePickerTitle.name,
      textContent: i18n(kw.fileSelection),
    });
    let filePickerBody = GM_addElement(filePicker, 'div', {
      class: khe.filePickerBody.name,
    });
    let fileList = GM_addElement(filePickerBody, 'div', {
      class: khe.fileList.name,
      id: khe.fileList.name,
    });
    let filePickerFooter = GM_addElement(filePicker, 'footer', {
      class: khe.filePickerFooter.name,
    });
    let filePickerActionWrapperSelection = GM_addElement(filePickerFooter, 'div', {
      class: khe.filePickerActionWrapper.name,
    });
    let selectAllButton = GM_addElement(filePickerActionWrapperSelection, 'button', {
      class: khe.actionButton.name,
      id: khe.filePickerActionSelectAllButton.name,
      textContent: i18n(kw.selectAll),
    });
    let clearAllButton = GM_addElement(filePickerActionWrapperSelection, 'button', {
      class: khe.actionButton.name,
      id: khe.filePickerActionClearAllButton.name,
      textContent: i18n(kw.clearAll),
    });
    let invertSelectionButton = GM_addElement(filePickerActionWrapperSelection, 'button', {
      class: khe.actionButton.name,
      id: khe.filePickerActionInvertSelectionButton.name,
      textContent: i18n(kw.invertSelection),
    });
    let filePickerActionWrapperSubmitOrCancel = GM_addElement(filePickerFooter, 'div', {
      class: khe.filePickerActionWrapper.name,
    });
    let submitButton = GM_addElement(filePickerActionWrapperSubmitOrCancel, 'button', {
      class: khe.actionButton.name,
      id: khe.filePickerActionSubmitButton.name,
      textContent: i18n(kw.confirm),
    });
    let cancelButton = GM_addElement(filePickerActionWrapperSubmitOrCancel, 'button', {
      class: khe.actionButton.name,
      id: khe.filePickerActionCancelButton.name,
      textContent: i18n(kw.cancel),
    });
    // Events:
    filePicker.addEventListener('close', () => {
      const rv = filePicker.returnValue;
      if (rv !== '') {
        createOrDisplayDownloadPanel();
        let files = JSON.parse(rv);
        for (const file of files) {
          downloadFileAndCreateControlItem(file);
        }
      }
    });
    selectAllButton.onclick = () => {
      if (fileList.hasChildNodes()) {
        const checkboxes = document.querySelectorAll(khe.fileListItemCheckbox.selector);
        for (const cb of checkboxes) {
          cb.checked = true;
        }
      }
    };
    clearAllButton.onclick = () => {
      if (fileList.hasChildNodes()) {
        const checkboxes = document.querySelectorAll(khe.fileListItemCheckbox.selector);
        for (const cb of checkboxes) {
          cb.checked = false;
        }
      }
    };
    invertSelectionButton.onclick = () => {
      if (fileList.hasChildNodes()) {
        const checkboxes = document.querySelectorAll(khe.fileListItemCheckbox.selector);
        for (const cb of checkboxes) {
          cb.checked ? cb.checked = false : cb.checked = true;
        }
      }
    };
    submitButton.onclick = () => {
      if (fileList.hasChildNodes()) {
        const files = tryGetPostFiles();
        let selectedFiles = [];
        const checkboxNodes = document.querySelectorAll(khe.fileListItemCheckbox.selector);
        for (let j = 0; j < checkboxNodes.length; j++) {
          const checkbox = checkboxNodes[j];
          if (checkbox.checked) {
            selectedFiles.push(files[j]);
          }
        }
        if (selectedFiles.length > 0) {
          filePicker.returnValue = JSON.stringify(selectedFiles);
        }
      }
      filePicker.close();
    };
    cancelButton.onclick = () => {
      filePicker.returnValue = '';
      filePicker.close();
    };
    filePicker.showModal();
  }
  refreshFileList();
} // End of function createOrDisplayFilePicker.

function refreshFileList() {
  const fileList = document.querySelector(khe.fileList.selector);
  if (fileList) {
    fileList.innerHTML = '';
    const files = tryGetPostFiles();
    if (files.length === 0) {
      GM_addElement(fileList, 'p', {
        textContent: i18n(kw.noFilesFound),
      });
      return;
    }
    for (const f of files) {
      let fileListItem = GM_addElement(fileList, 'div', {
        class: khe.fileListItem.name,
      });
      let fileListItemThumbnailWrapper = GM_addElement(fileListItem, 'div', {
        class: khe.fileThumbnailWrapper.name,
      });
      let fileListItemThumbnail = GM_addElement(fileListItemThumbnailWrapper, 'img', {
        class: khe.fileThumbnail.name,
        src: f.thumbUrl,
        alt: f.shortName,
        loading: 'lazy',
      });
      let fileListItemLabel = GM_addElement(fileListItem, 'label', {
        class: khe.fileListItemLabel.name,
      });
      let fileListItemCheckbox = GM_addElement(fileListItemLabel, 'input', {
        class: khe.fileListItemCheckbox.name,
        id: `${khe.fileListItemCheckbox.name}-${f.checksum}-${f.shortName}`,
        type: 'checkbox'
      });
      let labelText = GM_addElement(fileListItemLabel, 'span', {
        textContent: f.shortName,
      });
      // Events:
      fileListItemCheckbox.addEventListener('change', () => {
        fileListItemCheckbox.toggleAttribute('checked');
      })
    }
  }
} // End of function refreshFileList.

function createOrDisplayDownloadPanel() {
  const _downloadPanel = document.querySelector(khe.downloadPanel.selector);
  if (_downloadPanel) {
    _downloadPanel.classList.toggle('hide', false);
    _downloadPanel.classList.toggle('collapse', false);
    return;
  }
  const container = document.querySelector(cs.rootContainer);
  let downloadPanelWrapper = GM_addElement(container, 'div', {
    class: khe.downloadPanelWrapper.name,
  });
  let downloadPanel = GM_addElement(downloadPanelWrapper, 'div', {
    class: khe.downloadPanel.name,
    id: khe.downloadPanel.name,
  });
  let downloadPanelHeader = GM_addElement(downloadPanel, 'div', {
    class: khe.downloadPanelHeader.name,
  });
  let downloadPanelHeaderTitle = GM_addElement(downloadPanelHeader, 'p', {
    class: khe.downloadPanelHeaderTitle.name,
    textContent: i18n(kw.downloadPanel),
  });
  let downloadPanelHeaderButtonGroup = GM_addElement(downloadPanelHeader, 'div', {
    class: khe.downloadPanelHeaderButtonGroup.name,
  });
  let downloadPanelToggleButton = GM_addElement(downloadPanelHeaderButtonGroup, 'button', {
    class: khe.downloadPanelHeaderButton.name,
    id: khe.downloadPanelToggleButton.name,
    title: i18n(kw.toggleDownloadPanel),
  });
  let downloadPanelHideButton = GM_addElement(downloadPanelHeaderButtonGroup, 'button', {
    class: khe.downloadPanelHeaderButton.name,
    id: khe.downloadPanelHideButton.name,
    textContent: '✖',
    title: i18n(kw.hideDownloadPanel),
  });
  let downloadPanelBody = GM_addElement(downloadPanel, 'div', {
    class: khe.downloadPanelBody.name,
  });
  GM_addElement(downloadPanelBody, 'div', {
    class: khe.downloadItemsList.name,
    id: khe.downloadItemsList.name,
  });
  // Events:
  downloadPanelToggleButton.onclick = () => {
    downloadPanel.classList.toggle('collapse');
  };
  downloadPanelHideButton.onclick = () => {
    downloadPanel.classList.toggle('hide')
  };
} // End of function createOrDisplayDownloadPanel.

function downloadFileAndCreateControlItem(file) {
  const container = document.querySelector(khe.downloadItemsList.selector);
  let downloadItem = GM_addElement(container, 'div', {
    class: khe.downloadItem.name,
  });
  let downloadItemThumbnailWrapper = GM_addElement(downloadItem, 'div', {
    class: khe.fileThumbnailWrapper.name,
  });
  let downloadItemThumbnail = GM_addElement(downloadItemThumbnailWrapper, 'img', {
    class: khe.fileThumbnail.name,
    src: file.thumbUrl,
    alt: file.shortName,
    loading: 'lazy',
  });
  let downloadItemInfoWrapper = GM_addElement(downloadItem, 'div', {
    class: khe.downloadItemInfoWrapper.name,
  });
  let downloadItemName = GM_addElement(downloadItemInfoWrapper, 'p', {
    class: khe.downloadItemName.name,
    textContent: file.name,
  });
  let downloadItemStatusWrapper = GM_addElement(downloadItemInfoWrapper, 'div', {
    class: khe.downloadItemStatusWrapper.name,
  });
  let downloadItemStatusProgressBar = GM_addElement(downloadItemStatusWrapper, 'progress', {
    class: khe.downloadItemStatusProgressBar.name,
  });
  let downloadItemStatusStatistics = GM_addElement(downloadItemStatusWrapper, 'p', {
    class: khe.downloadItemStatusStatistics.name,
    textContent: i18n(kw.pending),
  });
  // Download control & events:
  let downloadControl = GM_download({
    url: file.url,
    name: file.name,
    onabort: () => {
      downloadItemStatusProgressBar.value = 0;
      downloadItemStatusStatistics.innerText = i18n(kw.cancelled);
    },
    onerror: () => {
      downloadItem.classList.toggle('fail', true);
      downloadItemStatusProgressBar.value = 0;
      downloadItemStatusStatistics.innerText = i18n(kw.errorOccurred);
    },
    onload: (ev) => {
      if (ev.status && ev.status === 200) {
        if (!ev.lengthComputable) {
          let loaded = ev.loaded;
          downloadItemStatusProgressBar.value = loaded;
          downloadItemStatusProgressBar.max = loaded;
          downloadItemStatusStatistics.innerText = `${toHumanReadableSize(loaded)}/${toHumanReadableSize(loaded)}`;
        }
        let s = downloadItemStatusStatistics.innerText;
        downloadItemStatusStatistics.innerText = `✓${i18n(kw.finished)} ${s}`;
      } else {
        downloadControl.abort();
        downloadItem.classList.toggle('fail', true);
        downloadItemStatusProgressBar.value = 0;
        downloadItemStatusStatistics.innerText = `${i18n(kw.errorOccurred)}: ${ev.status ?? '?'}`;
      }
    },
    onloadstart: (ev) => {
      if (ev.lengthComputable) {
        let loaded = ev.loaded;
        let total = ev.total;
        downloadItemStatusStatistics.innerText = `${toHumanReadableSize(loaded)}/${toHumanReadableSize(total)}`;
      } else {
        downloadItemStatusStatistics.innerText = i18n(kw.started);
      }
    },
    onprogress: (ev) => {
      if (ev.lengthComputable) {
        let loaded = ev.loaded;
        let total = ev.total;
        downloadItemStatusProgressBar.value = loaded;
        downloadItemStatusProgressBar.max = total;
        downloadItemStatusStatistics.innerText = `${toHumanReadableSize(loaded)}/${toHumanReadableSize(total)}`;
      } else {
        downloadItemStatusStatistics.innerText = i18n(kw.downloading);
      }
    },
  }); // End of downloadControl.
} // End of function downloadFileAndCreateControlItem.

// ***************************************
// Utils:
// ***************************************
function tryGetMetadata() {
  const userNameNode = document.querySelector(cs.userName);
  const postNameNode = document.querySelector(cs.postName);
  const publishDateNode = document.querySelector(cs.publishDate);
  // All these nodes above should exist.
  if (userNameNode && postNameNode && publishDateNode) {
    // Extract IDs in the url:
    // location.pathname: "/<WHERE>/user/<UID>/post/<PID>".
    const re = /^\/.+?\/user\/(\d+)\/post\/(\d+)$/;
    const m = location.pathname.match(re);
    // The result of Regexp match:
    // [0]: The whole url
    // [1]: The user ID
    // [2]: The post ID
    let metadata = {
      uid: m[1],
      userName: userNameNode.innerText,
      pid: m[2],
      // Replace '/' with ','
      postName: postNameNode.innerText.replaceAll('/', ','),
      // "2006-01-02" -> "2006.01.02"
      publishDate: publishDateNode.innerText.replaceAll('-', '.'),
    };
    return metadata;
  } else {
    console.error('%s: Fail to get metadata. Cannot match selectors:', si.name);
    !userNameNode && console.error(cs.userName);
    !postNameNode && console.error(cs.postName);
    !publishDateNode && console.error(cs.publishDate);
    throw new Error('Fail to get metadata.');
  }
} // End of function tryGetMetadata.

function tryMatchDownloadLink(url) {
  // A download link looks like:
  // "https://<HOST>/data/<SUM_HEAD1>/<SUM_HEAD2>/<CHECKSUM>.<MIMETYPE>?f=<NAME_URLENCODED>.<MIMETYPE>"
  const re = /^(https:\/\/.*\/data\/\w{2}\/\w{2}\/(\w*)\.(\w*))\?.*$/;
  const m = url.match(re);
  // A successful match should be:
  // [0]: The whole url
  // [1]: The download link without params
  // [2]: The checksum
  // [3]: The mimetype
  if (m && m.length === 4) {
    const url = m[1];
    const checksum = m[2];
    const mimetype = m[3];
    return { url, checksum, mimetype };
  } else {
    console.error('%s: Fail to match %s with %s', si.name, url, re);
    throw new Error('Fail to match a download link.');
  }
} // End of function tryMatchDownloadLink.

function tryGetPostAttachments() {
  const attachmentsNode = document.querySelector(cs.postAttachments);
  if (attachmentsNode === null || !attachmentsNode.hasChildNodes()) {
    return [];
  }
  let attachments = [];
  const attachmentLinkNodes = document.querySelectorAll(cs.postAttachmentLink);
  for (const node of attachmentLinkNodes) {
    const { url, checksum, mimetype } = tryMatchDownloadLink(node.href);
    // Though the parameter "f" in the download link indicates the name of the attachment,
    // it was not readable for human, because those non-ASCII characters were encoded.
    // Use the value of "download" attribute as the name instead.
    const name = node.download;
    let attachment = {
      url: url,
      name: name,
      checksum: checksum,
      mimetype: mimetype,
    };
    attachments.push(attachment);
  }
  return attachments;
} // End of function tryGetPostAttachments.

function tryGetPostFiles() {
  let filesNode = document.querySelector('.post__files');
  if (filesNode === null || !filesNode.hasChildNodes()) {
    return [];
  }
  let files = [];
  const { userName, postName, publishDate } = tryGetMetadata();
  const fileLinkNodes = document.querySelectorAll('a.fileThumb');
  for (let i = 0; i < fileLinkNodes.length; i++) {
    const fileLinkNode = fileLinkNodes[i];
    const fileThumbNode = fileLinkNode.children[0];
    const { url, checksum, mimetype } = tryMatchDownloadLink(fileLinkNode.href);
    // Because the "download" attribute of file could be uuid, md5 or an actual name,
    // use it as a file name is not helpful for management.
    // Names such as "1.png", "2.jpg" etc. are good,
    // since all the files in this post will be saved into a folder named after the name of the post.
    const fileName = `${i}.${mimetype}`;
    let file = {
      url: url,
      name: `${userName}-[${publishDate}]${postName}-${fileName}`,
      checksum: checksum,
      mimetype: mimetype,
      shortName: fileName,
      thumbUrl: fileThumbNode.src,
    };
    files.push(file);
  }
  return files;
} // End of function tryGetPostFiles.

/*****************************************
 * Convert large bytes to human readable format like 'K', 'M', 'G' etc.
 */
function toHumanReadableSize(bytes) {
  let n = bytes;
  if (bytes < 1024) {
    return `${n}B`;
  } else if (bytes >> 10 < 1024) {
    n = (bytes / 1024).toFixed(1).replace('.0', '');
    return `${n}K`;
  } else if (bytes >> 20 < 1024) {
    n = (bytes / 2 ** 20).toFixed(1).replace('.0', '');
    return `${n}M`;
  } else {
    n = (bytes / 2 ** 30).toFixed(1).replace('.0', '');
    return `${n}G`;
  }
} // End of function toHumanReadableSize.

// Hide all action panels when clicked somewhere in the page.
// The action panels have "stopPropagation()" to prevent event propagation,
// so click the panels and their contents will not propagate the click event to here.
self.addEventListener('click', (ev) => {
  const actionPanels = document.querySelectorAll(khe.actionPanel.selector);
  for (const panel of actionPanels) {
    if (!panel.parentElement.contains(ev.target)) {
      panel.classList.toggle('hide', true);
    }
  }
});
// ***************************************
// End of Utils.
// ***************************************
// *****************************************************************
// End of Tweaks.
// *****************************************************************
