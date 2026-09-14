import "./styles.css";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";
const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("App root was not found.");
}

app.innerHTML = `
  <section class="shell">
    <div class="eyebrow">Codeathon Starter</div>
    <h1>Ready for the problem statement.</h1>
    <p>
      This scaffold gives the team a clean frontend and backend without locking
      the project into features before the challenge is known.
    </p>
    <div class="actions">
      <a href="${apiBaseUrl}/health" target="_blank" rel="noreferrer">Check API</a>
    </div>
  </section>
`;
