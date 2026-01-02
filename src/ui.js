var createCurrencyBar = () => {
    const starBtn = ui.createButton({
        text: "Reallocate ★",
        onClicked: () => AllocUtils.simpleStar()
    });

    const sigmaBtn = ui.createButton({
        text: "Reallocate σ",
        onClicked: () => AllocUtils.simpleStudent(true)
    });

    starBtn.row = 0; starBtn.column = 0;
    sigmaBtn.row = 0; sigmaBtn.column = 1;

    return ui.createGrid({
        columnDefinitions: ["1*", "1*"],
        children: [starBtn, sigmaBtn]
    });
};
