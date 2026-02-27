// ==UserScript==
// @name        kemono helper
// @namespace   Violentmonkey Scripts
// @require     https://cdn.jsdelivr.net/npm/@violentmonkey/dom@2
// @match       https://kemono.cr/*
// @run-at      document-end
// @noframes
// @grant       unsafeWindow
// @grant       GM_getValue
// @grant       GM_SetValue
// @grant       GM_deleteValue
// @grant       GM_addElement
// @grant       GM_addStyle
// @grant       GM_notification
// @grant       GM_setClipboard
// @version     1.0
// ==/UserScript==

'use strict'

/* Extract the sha-256 sum of a file from the download link. */
function extractSHA256Sum(downloadLink) {
    try {
        const _downloadLinkPatterns = downloadLink.split('/')
        /* Find the index of string 'data',
         * then add 3 to the index to get the next pattern,
         * then split with '?' to get the next pattern,
         * then take the first item, split with '.',
         * then take the first item, the file checksum.
         */
        const checksum = _downloadLinkPatterns[_downloadLinkPatterns.indexOf('data') + 3].split('?')[0].split('.')[0]
        return checksum
    } catch (e) {
        let msg = `kh: Not a standard link: (${downloadLink}).\nMore info about a link is in the kh.`
        console.error(msg)
        console.error(e.message)
    }
}

/* A download link looks like:
 * '<protocol>://<hostname>/data/<checksum_header1>/<checksum_header2>/<checksum>.<file_suffix>?f=<file_name_encoded>.<file_suffix>'
 */
function buildDownloadBtn(downloadableContentContainer, postName, userName) {
    for (const downloadableContentNode of downloadableContentContainer.childNodes) {
        const downloadableLinkNode = downloadableContentNode.childNodes[0]
        if (downloadableLinkNode.nodeName.toLowerCase() !== 'a') {
            return
        }
        const downloadLink = downloadableLinkNode.attributes['href'].nodeValue
        const downloadName = downloadableLinkNode.attributes['download'].nodeValue
        const checksum = extractSHA256Sum(downloadLink)

        /**
         *  Since the name of the post may
         *  contain path separator like '/',
         *  replace it with other symbol.
         */
        const fileName = downloadName.replaceAll('/', '-')
        const url = `\n${downloadLink}\n out=${fileName}\n checksum=sha-256=${checksum}\n dir=${userName}/${postName}\n`

        const btn = unsafeWindow.document.createElement('button')
        btn.title = 'Get URL of this file for input file for aria2.'
        btn.innerText = '⭳ Download'
        btn.className = 'kh-btn-download'
        btn.addEventListener('click', function (ev) {
            GM_setClipboard(url)
            ev.target.innerText = '✓ Download'
        })

        downloadableContentNode.prepend(btn)

        g_isDonwloadBtnBuilt = true
    }
}

function run() {

    const target = unsafeWindow.document.querySelector('#root')
    const callback = function() {

        /* When the post has some downloadable links: */
        const downloadableContentContainer = unsafeWindow.document.querySelector('ul.post__attachments')
        const thedownloadBtn = unsafeWindow.document.querySelector('button.kh-btn-download')
        /* Only when found contents and no download button was build. */
        if (downloadableContentContainer !== null && thedownloadBtn === null) {
            /* Read the infomation about the user and the post. */
            const _postUserNameNode = unsafeWindow.document.querySelector('a.post__user-name')
            const postUserName = _postUserNameNode.innerText
            const _postTitleNode = unsafeWindow.document.querySelector('h1.post__title')
            const postTitle = _postTitleNode.innerText.replaceAll('/', ',')
            buildDownloadBtn(downloadableContentContainer, postTitle, postUserName)
        }

    }

    VM.observe(target, callback)
}


run()
