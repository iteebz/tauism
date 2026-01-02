var createCurrencyBar = () => {
    const switchBtn = ui.createButton({
        text: "Switch Theory",
        onClicked: () => switchTheory()
    });

    const starBtn = ui.createButton({
        text: "Realloc ★",
        onClicked: () => AllocUtils.simpleStar()
    });

    const sigmaBtn = ui.createButton({
        text: "Realloc σ",
        onClicked: () => AllocUtils.simpleStudent(true)
    });

    switchBtn.row = 0; switchBtn.column = 0;
    starBtn.row = 0; starBtn.column = 1;
    sigmaBtn.row = 0; sigmaBtn.column = 2;

    return ui.createGrid({
        columnDefinitions: ["1*", "1*", "1*"],
        children: [switchBtn, starBtn, sigmaBtn]
    });
};
