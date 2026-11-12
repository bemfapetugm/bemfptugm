/*
 * PENTING:
 * Ganti URL di bawah dengan URL Web App Google Apps Script
 * setelah backend selesai di-deploy.
 */
const API_URL = "https://script.google.com/macros/s/AKfycbyxkj8pp8mXxu5YSzFIn61kDEkfzeEvjncYda4OHK6HmDlKI1jlGC82Xa88N0kGiKVy/exec";

const MIN_CANDIDATES = 2;
const MAX_CANDIDATES = 30;

const ministries = [
  "Kementerian Sekretariat Kabinet",
  "Kementerian Keuangan",
  "Kementerian Komunikasi dan Digital",
  "Kementerian Hubungan Kerjasama",
  "Kementerian Advokasi dan Kesejahteraan Mahasiswa",
  "Kementerian Kreativitas dan Inovasi",
  "Kementerian Analisis dan Pergerakan",
  "Kementerian Sosial dan Lingkungan",
  "Kementerian Pemuda dan Olahraga",
  "Kementerian Kaderisasi dan Pengembangan",
];

const criteriaIds = [
  "activeStudent",
  "organizationPeriod",
  "ministryMeetings",
  "majorEvent",
  "leadership",
  "noSanctions",
  "commitment",
];

const form = document.getElementById("recommendationForm");
const candidateList = document.getElementById("candidateList");
const candidateTemplate = document.getElementById("candidateTemplate");
const addCandidateButton = document.getElementById("addCandidate");
const submitButton = document.getElementById("submitButton");
const formMessage = document.getElementById("formMessage");
const ministrySelect = document.getElementById("ministry");

function showMessage(message) {
  formMessage.textContent = message;
}

function populateMinistries() {
  ministries.forEach((ministry) => {
    const option = document.createElement("option");
    option.value = ministry;
    option.textContent = ministry;
    ministrySelect.appendChild(option);
  });
}

let ministryCheckRequest = 0;

async function checkSelectedMinistry() {
  const ministry = ministrySelect.value;
  const statusBox = document.getElementById("ministryStatus");

  ministryCheckRequest++;

  const requestNumber = ministryCheckRequest;

  statusBox.className = "ministry-status hidden";
  statusBox.textContent = "";

  // Pulihkan formulir sebelum memeriksa pilihan baru.
  setFormAvailability(true);

  if (!ministry) return;

  if (!API_URL.startsWith("https://script.google.com/")) {
    statusBox.textContent = "Status pengajuan belum dapat diperiksa.";
    statusBox.className = "ministry-status error";
    setFormAvailability(false);
    return;
  }

  statusBox.className = "ministry-status checking";
  statusBox.textContent = "Sedang memeriksa status pengajuan...";
  setFormAvailability(false);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify({
        action: "checkMinistry",
        ministry: ministry,
      }),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error("Gagal memeriksa status pengajuan.");
    }

    const result = await response.json();

    // Abaikan respons lama jika pengguna sudah memilih kementerian lain.
    if (requestNumber !== ministryCheckRequest) return;

    if (!result.success) {
      throw new Error(result.message || "Status tidak dapat diperiksa.");
    }

    if (result.submitted) {
      statusBox.innerHTML =
        "<strong>✓ Pengajuan Telah Diterima</strong>" +
        "Kementerian ini telah menyampaikan rekomendasi calon Menteri. " +
        "Setiap kementerian hanya dapat mengirimkan satu pengajuan resmi. " +
        "Terima kasih atas partisipasinya!";

      statusBox.className = "ministry-status submitted";
      setFormAvailability(false);
    } else {
      statusBox.innerHTML =
        "<strong>Kementerian dapat mengajukan</strong>" +
        "Belum terdapat pengajuan yang diterima dari kementerian ini.";

      statusBox.className = "ministry-status available";
      setFormAvailability(true);
    }
  } catch (error) {
    if (requestNumber !== ministryCheckRequest) return;

    statusBox.textContent =
      error.message || "Gagal memeriksa status pengajuan.";

    statusBox.className = "ministry-status error";
    setFormAvailability(false);
  }
}

function setFormAvailability(available) {
  const controls = form.querySelectorAll("input, textarea, button, select");

  controls.forEach((control) => {
    // Dropdown kementerian tetap aktif agar pilihan bisa diganti.
    if (control.id === "ministry") return;

    control.disabled = !available;
  });

  submitButton.disabled = !available;
  addCandidateButton.disabled =
    !available ||
    candidateList.querySelectorAll(".candidate-card").length >= MAX_CANDIDATES;
}

function updateCandidateNumbers() {
  const cards = candidateList.querySelectorAll(".candidate-card");

  cards.forEach((card, index) => {
    card.querySelector(".candidate-number").textContent = index + 1;
    card.querySelector(".remove-candidate").style.visibility =
      cards.length <= MIN_CANDIDATES ? "hidden" : "visible";
  });

  addCandidateButton.disabled = cards.length >= MAX_CANDIDATES;
  addCandidateButton.textContent =
    cards.length >= MAX_CANDIDATES
      ? "Maksimal 30 kandidat"
      : "+ Tambah Kandidat";
}

function addCandidate() {
  const currentCount = candidateList.querySelectorAll(".candidate-card").length;

  if (currentCount >= MAX_CANDIDATES) {
    showMessage("Maksimal 30 kandidat dalam satu pengajuan.");
    return;
  }

  const fragment = candidateTemplate.content.cloneNode(true);
  const card = fragment.querySelector(".candidate-card");

  card.querySelector(".remove-candidate").addEventListener("click", () => {
    card.remove();
    updateCandidateNumbers();
    showMessage("");
  });

  candidateList.appendChild(fragment);
  updateCandidateNumbers();
}

function getCandidates() {
  const cards = candidateList.querySelectorAll(".candidate-card");

  return Array.from(cards).map((card) => ({
    name: card.querySelector(".candidate-name").value.trim(),
    nim: card.querySelector(".candidate-nim").value.trim(),
    generation: card.querySelector(".candidate-generation").value.trim(),
    reason: card.querySelector(".candidate-reason").value.trim(),
    checks: {
      activeStudent: document.getElementById("activeStudent").checked,
      organizationPeriod: document.getElementById("organizationPeriod").checked,
      ministryMeetings: document.getElementById("ministryMeetings").checked,
      majorEvent: document.getElementById("majorEvent").checked,
      leadership: document.getElementById("leadership").checked,
      noSanctions: document.getElementById("noSanctions").checked,
      commitment: document.getElementById("commitment").checked,
    },
  }));
}

function validateBeforeSubmit(data) {
  if (!data.ministry) {
    return "Silakan pilih kementerian terlebih dahulu.";
  }

  if (
    !data.ministerName ||
    !data.ministerNim ||
    !data.viceName ||
    !data.viceNim
  ) {
    return "Identitas Menteri dan Wakil Menteri wajib dilengkapi.";
  }

  if (data.ministerNim === data.viceNim) {
    return "NIM Menteri dan Wakil Menteri tidak boleh sama.";
  }

  if (data.candidates.length < MIN_CANDIDATES) {
    return "Minimal harus memasukkan dua kandidat.";
  }

  const candidateNims = data.candidates.map((candidate) => candidate.nim);
  if (candidateNims.some((nim) => !nim)) {
    return "NIM seluruh kandidat wajib diisi.";
  }

  if (new Set(candidateNims).size !== candidateNims.length) {
    return "Terdapat NIM kandidat yang sama. Periksa kembali data kandidat.";
  }

  const allNames = data.candidates.map((candidate) =>
    candidate.name.toLowerCase(),
  );

  if (new Set(allNames).size !== allNames.length) {
    return "Terdapat nama kandidat yang sama. Periksa kembali data kandidat.";
  }

  if (criteriaIds.some((id) => !document.getElementById(id).checked)) {
    return "Seluruh persyaratan kandidat harus dikonfirmasi terlebih dahulu.";
  }

  if (!data.approval || !data.confidential || !data.truthful) {
    return "Seluruh pernyataan dan persetujuan wajib dicentang.";
  }

  return "";
}

function collectFormData() {
  return {
    ministry: ministrySelect.value,
    ministerName: document.getElementById("ministerName").value.trim(),
    ministerNim: document.getElementById("ministerNim").value.trim(),
    viceName: document.getElementById("viceName").value.trim(),
    viceNim: document.getElementById("viceNim").value.trim(),
    approval: document.getElementById("approval").checked,
    confidential: document.getElementById("confidential").checked,
    truthful: document.getElementById("truthful").checked,
    candidates: getCandidates(),
  };
}

async function submitForm(event) {
  event.preventDefault();
  showMessage("");

  if (!form.reportValidity()) {
    return;
  }

  if (!API_URL.startsWith("https://script.google.com/")) {
    showMessage(
      "URL backend belum dipasang. Hubungkan Google Apps Script terlebih dahulu.",
    );
    return;
  }

  const data = collectFormData();
  const statusBox = document.getElementById("ministryStatus");

  if (statusBox.classList.contains("submitted")) {
    showMessage("Kementerian ini sudah pernah mengirim pengajuan.");
    return;
  }

  if (!statusBox.classList.contains("available")) {
    showMessage("Status kementerian belum berhasil diverifikasi.");
    return;
  }
  const validationMessage = validateBeforeSubmit(data);

  if (validationMessage) {
    showMessage(validationMessage);
    return;
  }

  const confirmed = window.confirm(
    "Apakah seluruh data sudah benar dan pengajuan siap dikirim?",
  );

  if (!confirmed) return;

  submitButton.disabled = true;
  submitButton.textContent = "Mengirim...";

  document.getElementById("loadingOverlay").classList.remove("hidden");
  showMessage("Sedang mengirim pengajuan. Mohon jangan tutup halaman ini.");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(data),
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error("Server memberikan respons HTTP " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Pengajuan belum berhasil diproses.");
    }

    document.getElementById("submissionId").textContent =
      result.submissionID || result.submissionId || "-";

    form.classList.add("hidden");
    document.querySelector(".notice").classList.add("hidden");
    document.querySelector(".hero").classList.add("hidden");
    document.getElementById("successPanel").classList.remove("hidden");

    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("Submission error:", error);
    showMessage(
      error.message ||
        "Pengajuan belum dapat dikirim. Periksa koneksi dan coba kembali.",
    );
  } finally {
    document.getElementById("loadingOverlay").classList.add("hidden");

    submitButton.disabled = false;
    submitButton.textContent = "Kirim Pengajuan";
  }
}

populateMinistries();

for (let i = 0; i < MIN_CANDIDATES; i++) {
  addCandidate();
}

addCandidateButton.addEventListener("click", addCandidate);
form.addEventListener("submit", submitForm);
ministrySelect.addEventListener("change", checkSelectedMinistry);

// WELCOME SCREEN
document.addEventListener("DOMContentLoaded", function () {
  const welcomeScreen = document.getElementById("welcomeScreen");
  const startButton = document.getElementById("startButton");

  if (!welcomeScreen || !startButton) return;

  startButton.addEventListener("click", function () {
    welcomeScreen.classList.add("hide");

    setTimeout(function () {
      welcomeScreen.remove();
    }, 900);
  });
});
