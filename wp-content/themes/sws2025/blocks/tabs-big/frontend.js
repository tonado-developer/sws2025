function openTab(element) {
    if(element.classList.contains("current")) return;
    const parent = element.closest(".tabContainer");
    // const Wrap = parent.querySelector(".tabWrap");
    // Wrap.classList.remove("open");
    const panes = parent.querySelectorAll(".tabPane");
    const buttons = parent.querySelectorAll(".button");
    buttons.forEach(button => button.classList.remove("current"));
    setTimeout(() => {
        panes.forEach(pane => pane.classList.remove("open"));
        const pane = parent.querySelector(".pane-" + element.dataset.pane);

        element.classList.add("current");

        pane.classList.add("open");
        // Wrap.classList.add("open");
    }, 0); // parent.dataset.duration / 2
}
