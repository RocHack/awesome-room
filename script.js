// Get IRC updates from the couch
Couch.urlPrefix = '/couch';
var db = Couch.db('rochackircmarkov');
db.changes(null, {
    include_docs: true
}).onChange(function (resp) {
    if (resp.results) resp.results.forEach(addChatRow);
});

// Get latest IRC messages
db.view('couchgrams/all', {
    descending: true,
    limit: 15,
    include_docs: true,
    error: function () {},
    success: function (resp) {
        if (resp && resp.rows) resp.rows.reverse().forEach(addChatRow);
    }
});

var chatList = document.getElementById("chat-messages");

function addChatRow(row) {
    var date = new Date(row.id * 1000);
    var text = row.doc.text;
    // Insert chat message
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(text));
    li.title = date.toLocaleString();
    chatList.appendChild(li);
}

var localVideoEl = document.getElementById('localVideo');
var remoteVideosEl = document.getElementById('remotes');

// create our webrtc connection
var webrtc = new WebRTC({
    localVideoEl: 'localVideo',
    remoteVideosEl: remoteVideosEl,
    // immediately ask for camera access
    autoRequestMedia: true,
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
        if (totalHeight < containerHeight) {
            w = 1/cols;
            if (w > bestFit) bestFit = w;
        }
        height = containerHeight/rows;
        width = height / aspect;
        var totalWidth = cols * width;
        if (totalWidth < containerWidth) {
            w = width/containerWidth;
            if (w > bestFit) bestFit = w;
        }
    }
    return bestFit * containerWidth;
}

// Update the size of the videos dynamically
function updateVideoSizes() {
    var videos = [].slice.call(remotes.getElementsByTagName("*"));
    var width = fitVideos(remoteVideosEl, videos) + "px";
    videos.forEach(function (video) {
        video.style.width = width;
    });
}

updateVideoSizes();
webrtc.on('videoAdded', updateVideoSizes);
webrtc.on('videoRemoved', updateVideoSizes);
window.addEventListener('resize', updateVideoSizes, false);

