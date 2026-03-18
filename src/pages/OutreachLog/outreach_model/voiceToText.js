// 🎙️ Start recording using browser
export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const mediaRecorder = new MediaRecorder(stream);
  const chunks = [];

  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  mediaRecorder.start();

  return {
    mediaRecorder,
    stop: () =>
      new Promise((resolve) => {
        mediaRecorder.onstop = () => {
          stream.getTracks().forEach(track => track.stop());
          resolve(new Blob(chunks, { type: 'audio/webm' }));
        };
        mediaRecorder.stop();
      }),
  };
}


// 🌐 Send audio to backend
export async function transcribeAudio(audioBlob) {
  const formData = new FormData();
  formData.append("file", audioBlob);

  const response = await fetch("http://127.0.0.1:8000/transcribe", {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  return data.text;
}