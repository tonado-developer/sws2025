function openAccordionPane(element) {
    const parent = element.closest(".wp-block-sws2025-accordion");
    const panes = parent.querySelectorAll(".row");
    const images = parent.querySelectorAll(".imageWrap");
    const currentRow = element.closest(".row");
    
    // Alle schließen
    panes.forEach(pane => pane.classList.remove("open"));
    images.forEach(image => image.classList.remove("open"));
    
    // Aktuelles öffnen
    currentRow.classList.add("open");

    // Entsprechendes Bild öffnen (basierend auf data-id oder Index)
    const rowId = currentRow.dataset.id || Array.from(panes).indexOf(currentRow);
    const targetImage = parent.querySelector(`.imageWrap[data-id="${rowId}"]`);
    if (targetImage) {
        targetImage.classList.add("open");
    }
}