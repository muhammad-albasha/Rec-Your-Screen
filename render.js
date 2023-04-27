const { desktopCapturer, remote } = require('electron');
const { writeFile } = require('fs');
const { dialog, Menu } = remote;

const recordedChunks = [];
const videoElement = document.querySelector('video');
const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const videoSelectBtn = document.getElementById('selectVideo');

let mediaRecorder = null;
let selectedSource = null;

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);
videoSelectBtn.addEventListener('click', getVideoSources);

async function getVideoSources() {
  const inputSources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
  const videoOptionsMenu = Menu.buildFromTemplate(
    inputSources.map(source => ({
      label: source.name,
      click: () => selectSource(source)
    }))
  );
  videoOptionsMenu.popup();
}

async function selectSource(source) {
  selectedSource = source;
  videoSelectBtn.innerText = source.name;
  await setupMediaRecorder();
}

async function setupMediaRecorder() {
  if (!selectedSource) {
    return;
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: selectedSource.id
      }
    }
  });

  videoElement.srcObject = stream;
  videoElement.play();

  mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
  mediaRecorder.addEventListener('dataavailable', handleDataAvailable);
  mediaRecorder.addEventListener('stop', handleStop);
}

function startRecording() {
  if (!mediaRecorder) {
    return;
  }
  mediaRecorder.start();
  startBtn.classList.add('is-danger');
  startBtn.innerText = 'Recording';
}

function stopRecording() {
  if (!mediaRecorder) {
    return;
  }
  mediaRecorder.stop();
  startBtn.classList.remove('is-danger');
  startBtn.innerText = 'Start';
}

async function handleDataAvailable(event) {
  recordedChunks.push(event.data);
}

async function handleStop(event) {
  const blob = new Blob(recordedChunks, { type: 'video/webm; codecs=vp9' });
  const { filePath } = await dialog.showSaveDialog({
    buttonLabel: 'Save video',
    defaultPath: `vid-${Date.now()}.webm`
  });
  if (!filePath) {
    return;
  }
  const buffer = Buffer.from(await blob.arrayBuffer());
  await writeFile(filePath, buffer);
}
