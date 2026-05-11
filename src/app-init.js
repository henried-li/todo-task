import { init } from "./app.js";

const mode = new URLSearchParams(location.search).get("mode") === "sidepanel"
  ? "sidepanel"
  : "tab";

init(document.getElementById("root"), mode);
