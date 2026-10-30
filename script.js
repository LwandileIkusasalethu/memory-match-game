const hideBox = () => {
  document.getElementById("Question-box").style.display = "none";
}
const showBox = () => {
  document.getElementById("Question-box").style.display = "block";
}

window.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("startButton");
  const gameFrame = document.getElementById("gameFrame");
  const backgroundMusic = document.getElementById("backgroundMusic");
  const musicStatus = document.getElementById("music-status");


  if (startButton && gameFrame && backgroundMusic && musicStatus) {


    const openGame = (url) => {
      musicStatus.textContent = "";
      backgroundMusic.play().catch((error) => {
        musicStatus.textContent = "Music could not be played. Please check your browser's audio settings.";
        console.error("Unable to play background music:", error);
      });
      gameFrame.src = url;
      gameFrame.hidden = false;
      document.body.classList.add("game-started");
    };

    startButton.addEventListener("click", () => openGame("OCEANS.html"));

    window.addEventListener("message", (event) => {
      if (
        event.source !== gameFrame.contentWindow ||
        !event.data ||
        typeof event.data.type !== "string"
      ) {
        return;
      }

      if (event.data.type === "memory-game:best-time-updated") {
        updateBestTime();
      } else if (event.data.type === "memory-game:choose-another") {
        gameFrame.hidden = true;
        gameFrame.src = "about:blank";
        document.body.classList.remove("game-started");
        const menuToggle = document.querySelector('label > input[type="checkbox"]');
        if (menuToggle) menuToggle.checked = true;
      }
    });

    const slideMenu = document.querySelector(".slide");
    const menuToggle = document.querySelector('label > input[type="checkbox"]');
    if (slideMenu && menuToggle) {
      slideMenu.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;

        event.preventDefault();
        menuToggle.checked = false;
        if (link.getAttribute("href") === "index.html") {
          gameFrame.hidden = true;
          gameFrame.src = "about:blank";
          document.body.classList.remove("game-started");
          return;
        }

        openGame(link.href);
      });
    }
  }

  const bestTime = document.getElementById("best-time");
  const getBestTime = () => {
    const saved = localStorage.getItem("memory_best_time");
    const best = saved === null ? NaN : Number(saved);
    return Number.isFinite(best) && best >= 0 ? best : null;
  };
  const updateBestTime = () => {
    if (!bestTime) return;

    const best = getBestTime();
    bestTime.textContent = best !== null
      ? "Best Time: " + best.toFixed(1) + "s"
      : "Best Time: --";
  };

  updateBestTime();
  window.addEventListener("storage", (event) => {
    if (event.key === "memory_best_time") updateBestTime();
  });

  const timer = document.getElementById("timer");
  const cards = document.querySelectorAll(".image-card");
  if (!timer || cards.length === 0) return;

  const showCompletionDialog = (seconds) => {
    const styles = document.createElement("style");
    styles.textContent = `
      .completion-overlay {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(8, 12, 30, 0.78);
        backdrop-filter: blur(8px);
      }

      .completion-dialog {
        width: min(440px, 100%);
        padding: 36px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 24px;
        background: linear-gradient(145deg, #20264d, #141a36);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        color: #f7f8ff;
        text-align: center;
      }

      .completion-dialog h2 {
        margin-bottom: 12px;
        font-size: clamp(26px, 6vw, 36px);
      }

      .completion-dialog p {
        margin-bottom: 26px;
        color: #c3c9e8;
        line-height: 1.6;
      }

      .completion-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 12px;
      }

      .completion-actions button {
        min-height: 46px;
        padding: 12px 20px;
        border: 0;
        border-radius: 999px;
        background: linear-gradient(110deg, #79f2e3, #a9a0ff);
        color: #10152f;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .completion-actions button:hover {
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(styles);

    const overlay = document.createElement("div");
    overlay.className = "completion-overlay";
    overlay.innerHTML = `
      <section class="completion-dialog" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <h2 id="completion-title">You matched them all!</h2>
        <p>Great memory! You finished in ${seconds.toFixed(1)} seconds.</p>
        <div class="completion-actions">
          <button type="button" data-action="restart">Restart</button>
          <button type="button" data-action="choose-game">Choose another game</button>
        </div>
      </section>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('[data-action="restart"]').addEventListener("click", () => {
      window.location.reload();
    });
    overlay.querySelector('[data-action="choose-game"]').addEventListener("click", () => {
      if (window.parent === window) {
        window.location.href = "index.html";
        return;
      }

      window.parent.postMessage({ type: "memory-game:choose-another" }, "*");
    });
  };

  let elapsedMs = 0;
  let interval = null;
  let startedAt = null;
  let firstCard = null;
  let firstImage = "";
  let matchedPairs = 0;
  let finished = false;

  const updateTimer = () => {
    elapsedMs = performance.now() - startedAt;
    timer.textContent = "Time: " + (elapsedMs / 1000).toFixed(1) + "s";
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    clearInterval(interval);
    updateTimer();
    const seconds = +(elapsedMs / 1000).toFixed(1);
    const currentBest = getBestTime();
    if (currentBest === null || seconds < currentBest) {
      localStorage.setItem("memory_best_time", seconds.toString());
      if (window.parent !== window) {
        window.parent.postMessage({ type: "memory-game:best-time-updated" }, "*");
      }
    }
    showCompletionDialog(seconds);
  };

  document.addEventListener("click", (event) => {
    const card = event.target.closest(".image-card");
    if (!card || card.dataset.matched === "true" || finished) return;

    if (interval === null) {
      startedAt = performance.now();
      interval = setInterval(() => {
        updateTimer();
      }, 100);
    }

    const image = card.currentSrc || card.src;
    if (firstCard === null) {
      firstCard = card;
      firstImage = image;
      return;
    }

    if (card !== firstCard && image === firstImage) {
      firstCard.dataset.matched = "true";
      card.dataset.matched = "true";
      matchedPairs++;
      if (matchedPairs === cards.length / 2) finish();
    }
    firstCard = null;
    firstImage = "";
  });
});
