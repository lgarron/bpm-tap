let fileName = "beats";

let count = 0;
let msecsFirst = 0;
let msecsPrevious = 0;
let playing = false;
let startTime = 0;
let beats: [number, number][] = [];

function mustExist<T>(t: T | null): NonNullable<T> {
  if (!t) {
    throw new Error("Missing element");
  }
  return t;
}

const audioElem = document.getElementById("audio") as HTMLAudioElement;

function currentTime() {
  const time = audioElem.currentTime;
  return time;
}

function ResetCount() {
  count = 0;
  mustExist(document.querySelector<HTMLInputElement>("#T_AVG")).value = "";
  mustExist(document.querySelector<HTMLInputElement>("#T_TAP")).value = "";
  // -  document.TAP_DISPLAY.T_RESET.blur();
}

function startAudio(force: boolean) {
  if (!playing || force) {
    audioElem.currentTime = 0;
    audioElem.play();
    startTime = currentTime();
    playing = true;
  }
}

function displayBeats() {
  mustExist(document.getElementById("beat_vals")).innerHTML =
    JSON.stringify(beats);
  mustExist(document.getElementById("num_beats")).innerHTML =
    beats.length.toString();
}

function resetBeats() {
  beats = [];
  displayBeats();
}

function undoLastBeats(n: number) {
  const len = Math.max(beats.length - n, 0);
  beats.length = len;
  audioElem.currentTime = beats[len - 1][0];
  displayBeats();
}

function TapForBPM(e: KeyboardEvent): boolean {
  console.log(e.keyCode);
  switch (e.keyCode) {
    case 122: // z
      ResetCount();
      return true;
    case 115: // s
      startAudio(false);
      break;
    case 114: // r
      startAudio(true);
      break;
    case 113: // q
      resetBeats();
      break;
    case 98: // b
      undoLastBeats(3);
      break;
    case 99: // c
      addBeat(true);
      break;
    case 109: // m
      addBeat(true);
      break;
    default:
      addBeat(false);
      break;
  }
  return false;
}

function addBeat(n: boolean) {
  const msecs = Math.floor(currentTime() * 1000);
  const toPush: [number, number] = [(msecs - startTime) / 1000, 0];
  if (n) {
    toPush[1] = 1;
  }
  beats.push(toPush);

  displayBeats();

  if (count === 0) {
    msecsFirst = msecs;
    count = 1;
  } else {
    const bpmAvg = (60000 * count) / (msecs - msecsFirst);
    mustExist(document.querySelector<HTMLInputElement>("#T_AVG")).value =
      `${Math.round(bpmAvg * 100) / 100}`;
    count++;
    mustExist(document.querySelector<HTMLInputElement>("#T_TAP")).value =
      `${count}`;
  }

  msecsPrevious = msecs;

  return true;
}

function touchStart() {
  console.log("touchStart");
  mustExist(document.getElementById("T_TAP")).setAttribute(
    "class",
    "disp tapped",
  );
  addBeat(false);
}

function touchEnd() {
  mustExist(document.getElementById("T_TAP")).setAttribute("class", "disp");
}

document.onkeypress = TapForBPM;
function dragEnter(ev: DragEvent) {
  console.log("dragEnter");
  ev.preventDefault();
  console.log("Enter");
  //ev.preventDefault();
  return true;
}

function setDragDropVisualFeedback(text: string, cssClass: string) {
  mustExist(document.getElementById("new_song")).innerHTML = text;
  const cL = mustExist(document.getElementById("new_song")).classList;
  while (cL.length > 0) {
    cL.remove(cL[0]);
  }
  mustExist(document.getElementById("new_song")).classList.add(cssClass);
}

function dragOver(ev: DragEvent) {
  console.log("dragOver");
  ev.preventDefault();
  console.log("Over");
  setDragDropVisualFeedback("Let Go!", "over");
  return false;
}

function dragLeave(ev: DragEvent) {
  console.log("dragLeave");
  ev.preventDefault();
  console.log("Leave");
  setDragDropVisualFeedback("Come back! :-D", "out");
  return false;
}

function dragDrop(ev: DragEvent) {
  console.log("dragDrop");
  ev.preventDefault();
  console.log("Drop");
  const src = mustExist(ev.dataTransfer).files[0];
  fileName = src.name;
  console.log(fileName);
  const bl = new Blob([src]);
  audioElem.src = window.webkitURL.createObjectURL(bl);

  console.log(audioElem.src);

  // I can't find the right way to check this. For now, it'll always report success. :-/
  if (audioElem.src !== undefined) {
    setDragDropVisualFeedback(
      "Got it! :-)<br>Press 's' to begin playing.",
      "done",
    );
  } else {
    setDragDropVisualFeedback(
      "Didn't work. :-(<br>(Did you open this page on your hard drive?)",
      "error",
    );
  }

  return false;
}

function downloaddd(filename: string, text: string) {
  // biome-ignore lint/style/noParameterAssign: Legacy code.
  filename = filename || "beats";

  const myFile = new Blob([text], { type: "text/plain" });

  const n = JSON.parse(text).length;

  const element = document.createElement("a");
  element.setAttribute("href", window.URL.createObjectURL(myFile));
  element.setAttribute("download", `${filename} (${n} beats).json`);

  element.style.display = "none";
  document.body.appendChild(element);

  console.log(element);

  element.click();

  document.body.removeChild(element);
}

function ini() {
  // document.getElementById("tap_area").addEventListener( 'touchstart', touchStart, false );
  //document.getElementById("tap_area").addEventListener( 'touchend', touchEnd, false );
  //document.getElementById("tap_area").addEventListener( 'mousedown', touchStart, false );
  //document.getElementById("tap_area").addEventListener( 'mouseup', touchEnd, false );

  document.body.addEventListener("dragenter", dragEnter, false);
  document.body.addEventListener("dragover", dragOver, false);
  document.body.addEventListener("dragleave", dragLeave, false);
  document.body.addEventListener("drop", dragDrop, false);
  mustExist(document.body.querySelector("#download_json")).addEventListener(
    "click",
    (e) => {
      console.log(e);
      downloaddd(
        fileName,
        mustExist(document.getElementById("beat_vals") as HTMLInputElement)
          .value,
      );
      e.preventDefault();
    },
  );
}
