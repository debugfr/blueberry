const hub = document.querySelector(".hub");
const logoFrame = document.querySelector(".logo-frame");
const privateToggle = document.querySelector("#private-default-toggle");
const browserLink = document.querySelector(".browser-option");
const privateDefaultKey = "blueberryub.private-default";

if (privateToggle && browserLink) {
  privateToggle.checked = localStorage.getItem(privateDefaultKey) === "true";

  const updateBrowserLink = () => {
    browserLink.href = privateToggle.checked ? "/browser.html?private=1" : "/browser.html";
  };

  privateToggle.addEventListener("change", () => {
    localStorage.setItem(privateDefaultKey, String(privateToggle.checked));
    updateBrowserLink();
  });

  updateBrowserLink();
}

if (hub && logoFrame && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  hub.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;

    const bounds = hub.getBoundingClientRect();
    const offsetX = (event.clientX - (bounds.left + bounds.width / 2)) / (bounds.width / 2);
    const offsetY = (event.clientY - (bounds.top + bounds.height / 2)) / (bounds.height / 2);
    logoFrame.style.setProperty("--logo-x", `${Math.max(-10, Math.min(10, offsetX * 10))}px`);
    logoFrame.style.setProperty("--logo-y", `${Math.max(-10, Math.min(10, offsetY * 10))}px`);
  });

  hub.addEventListener("pointerleave", () => {
    logoFrame.style.setProperty("--logo-x", "0px");
    logoFrame.style.setProperty("--logo-y", "0px");
  });
}