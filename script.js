var chatList = document.getElementById("chat-messages");

if (chatList) {
    // Get IRC updates from the couch
    Couch.urlPrefix = '/couch';
    var db = Couch.db('rochackircmarkov');
    db.changes(null, {
        include_docs: true,
        filter: 'couchgrams/text'
    }).onChange(function (resp) {
        if (resp.results) resp.results.forEach(addChatRow);
    });

    // Get latest IRC messages
    db.view('couchgrams/text', {
        descending: true,
        limit: 25,
        include_docs: true,
        error: function () {},
        success: function (resp) {
            if (resp && resp.rows) resp.rows.reverse().forEach(addChatRow);
        }
    });
}

var urlRegex = /[a-z]{2,}:\/\/*[^ ]*(?= |$)/g;

function addChatRow(row) {
    var date = new Date(row.id * 1000);
    var text = row.doc.text;
    var sender = row.doc.sender;
    // Insert chat message
    var li = document.createElement("li");
    if (sender) li.appendChild(document.createTextNode('<' + sender + '> '));
    /*
    if (sender) {
        var b = document.createElement("strong");
        b.appendChild(document.createTextNode(sender));
        li.appendChild(b);
        li.appendChild(document.createTextNode(" "));
    }
    */

    // Turn URLs into links.
    var urls = [];
    var match;
    while (match = urlRegex.exec(text)) {
        urls.push(match[0]);
    }
    text.split(urlRegex).forEach(function (text) {
        // Write text segment
        li.appendChild(document.createTextNode(text));
        // Write link
        if (urls.length == 0) return;
        var url = urls.pop();
        var link = document.createElement("a");
        link.setAttribute("href", url);
        link.appendChild(document.createTextNode(url));
        li.appendChild(link);
    });

    li.title = date.toLocaleString();
    chatList.appendChild(li);
}

var localVideoEl = document.getElementById('localVideo');
var remoteVideosEl = document.getElementById('remotes');

// create our webrtc connection
var webrtc = new WebRTC({
    localVideoEl: localVideoEl,
    remoteVideosEl: remoteVideosEl,
    // immediately ask for camera access
    autoRequestMedia: true,
    peerConnectionConfig: {
        iceServers: navigator.mozGetUserMedia ?
            [{"url":"stun:124.124.124.2"}] :
            [{"url": "stun:stun.l.google.com:19302"}],
        onChannelOpened: function (channel) {
            console.log('channel opened', channel);
        },
        onChannelMessage: function (event) {
            console.log('channel message', event.data);
        }
    },
    log: false
});

// when it's ready, join
webrtc.on('readyToCall', function () {
    webrtc.joinRoom('RocHack');
});

var showIRC = !window.localStorage['hide-irc'];
var toggleIRCLink = document.getElementById("toggle-irc");

function updateIRCView() {
    window.localStorage['hide-irc'] = showIRC ? "" : "hide";
    document.body.className = showIRC ?
        document.body.className.replace(/ hide-irc/g, '') :
        document.body.className + ' hide-irc';
    toggleIRCLink.innerHTML = showIRC ? "&#187;" : "&#171;";
}
updateIRCView();

toggleIRCLink.addEventListener("click", function (e) {
    e.preventDefault();
    showIRC = !showIRC;
    updateIRCView();
    setTimeout(updateVideoSizes, 500);
}, false);

function fitVideos(container, videos) {
    if (!videos[0]) return 1;
    var videoWidth = videos[0].offsetWidth;
    var videoHeight = videos[0].offsetHeight;
    var aspect = videoHeight / videoWidth;
    var containerWidth = container.offsetWidth;
    var containerHeight = container.offsetHeight;
    var numVideos = videos.length;
    var bestFit = 0;
    for (var cols = 1; cols <= numVideos; cols++) {
        var width, height, w;
        var rows = Math.ceil(numVideos/cols);
        width = containerWidth/cols;
        height = width * aspect;
        var totalHeight = rows * height;
        if (totalHeight <= containerHeight) {
            w = 1/cols;
            if (w > bestFit) bestFit = w;
        }
        height = containerHeight/rows;
        width = height / aspect;
        var totalWidth = cols * width;
        if (totalWidth <= containerWidth) {
            w = width/containerWidth;
            if (w > bestFit) bestFit = w;
        }
    }
    return bestFit * containerWidth;
}

// Update the size of the videos dynamically
function updateVideoSizes() {
    var videos = [].slice.call(remoteVideosEl.getElementsByTagName("*"));
    var width = fitVideos(remoteVideosEl, videos) + "px";
    videos.forEach(function (video) {
        video.style.width = width;
    });
}

updateVideoSizes();
webrtc.on('videoAdded', updateVideoSizes);
webrtc.on('videoRemoved', updateVideoSizes);
webrtc.on('readyToCall', updateVideoSizes);
window.addEventListener('resize', updateVideoSizes, false);

