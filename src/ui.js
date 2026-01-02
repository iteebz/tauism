import { state } from './state.js';
import { AllocUtils } from './utils/alloc.js';
import { MIN_ALLOC_FREQ } from './config.js';

export const createCurrencyBar = () => {
    const starBtn = ui.createButton({
        text: "Reallocate ★",
        onClicked: () => AllocUtils.simpleStar()
    });

    const sigmaBtn = ui.createButton({
        text: "Reallocate σ",
        onClicked: () => AllocUtils.simpleStudent(state.useR9)
    });

    const r9Toggle = ui.createStackLayout({
        children: [
            ui.createLabel({
                text: "Buy R9?",
                fontSize: 10,
                verticalTextAlignment: TextAlignment.END,
                horizontalTextAlignment: TextAlignment.CENTER,
                textColor: () => state.useR9 ? Color.TEXT : Color.DEACTIVATED_UPGRADE
            }),
            ui.createSwitch({
                onColor: Color.SWITCH_BACKGROUND,
                isToggled: () => state.useR9,
                onTouched: (e) => { if (e.type == TouchType.PRESSED) state.useR9 = !state.useR9; }
            })
        ]
    });

    starBtn.row = 0; starBtn.column = 0;
    sigmaBtn.row = 0; sigmaBtn.column = 1;
    r9Toggle.row = 0; r9Toggle.column = 2;

    const allocGrid = ui.createGrid({
        columnDefinitions: ["1*", "1*", "50"],
        children: [starBtn, sigmaBtn, r9Toggle]
    });

    const freqBtn = ui.createButton({
        text: () => {
            const f = state.autoFreq < MIN_ALLOC_FREQ ? "Never" : `${state.autoFreq} ticks`;
            return "Auto-reallocation: " + f;
        },
        onClicked: () => showFreqPopup()
    });

    const varToggle = createToggle("Auto Variables", () => state.enableVariablePurchase, () => state.enableVariablePurchase = !state.enableVariablePurchase);
    const msToggle = createToggle("Auto Milestones", () => state.enableMSPurchase, () => state.enableMSPurchase = !state.enableMSPurchase);
    const pubToggle = createToggle("Auto Publish", () => state.enablePublications, () => state.enablePublications = !state.enablePublications);
    const switchToggle = createToggle("Auto Switch", () => state.enableTheorySwitch, () => state.enableTheorySwitch = !state.enableTheorySwitch);

    varToggle.row = 0; varToggle.column = 0;
    msToggle.row = 0; msToggle.column = 1;
    pubToggle.row = 1; pubToggle.column = 0;
    switchToggle.row = 1; switchToggle.column = 1;

    const toggleGrid = ui.createGrid({
        rowDefinitions: ["1*", "1*"],
        columnDefinitions: ["1*", "1*"],
        children: [varToggle, msToggle, pubToggle, switchToggle]
    });

    return ui.createStackLayout({
        children: [allocGrid, freqBtn, toggleGrid]
    });
};

const createToggle = (label, getter, toggle) => {
    return ui.createStackLayout({
        children: [
            ui.createLabel({
                text: label,
                fontSize: 10,
                verticalTextAlignment: TextAlignment.END,
                horizontalTextAlignment: TextAlignment.CENTER,
                textColor: () => getter() ? Color.TEXT : Color.DEACTIVATED_UPGRADE
            }),
            ui.createSwitch({
                onColor: Color.SWITCH_BACKGROUND,
                isToggled: getter,
                onTouched: (e) => { if (e.type == TouchType.PRESSED) toggle(); }
            })
        ]
    });
};

const showFreqPopup = () => {
    let record = state.autoFreq.toString();

    const entry = ui.createEntry({
        placeholder: record,
        onTextChanged: (_, s) => { record = s; }
    });

    const apply = ui.createButton({ text: "Apply" });
    const text = ui.createLabel({
        text: `Enter tick frequency for auto-reallocation.\nValues < ${MIN_ALLOC_FREQ} = disabled.`
    });

    const popup = ui.createPopup({
        title: "Reallocation Frequency",
        content: ui.createStackLayout({ children: [entry, text, apply] })
    });

    apply.onClicked = () => {
        const num = parseInt(record);
        if (!isNaN(num)) state.autoFreq = num;
        popup.hide();
    };

    popup.show();
};
