(function () {
    ModAPI.meta.title("🎮 Gamepad API Integration");
    ModAPI.meta.version("1.0pre6");
    ModAPI.meta.icon("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAANCAYAAACgu+4kAAAAAXNSR0IArs4c6QAAAPhJREFUOE+NkrEKgzAQhv+AOAguOnTQ1yjduoiufQkfy5foanHpVvoaOhR0EhxUSMnRhCRNSrNcjrv77v7kGD6nrmsu78I2TcN03xenpL7veZZlej6GYTB8FX9VwKGleJ7njOnF0zRRUZqmZJdlQRiGCIKA/OoBtCcAZQncbgRRAFE8zzO2bUOSJATZ9x3ruiKKIjXN8X7B83wl3wkQgTiO1RSGDssxACKmSyiKAl3XUQljjHHOuS3xCyAbyGJpBWAcR25L9AIEyJ5AAnSJPwGub/xbgvxj/c18u2LsgfwasSCu17chJMHeRFd3CdMBahP1oLj7uvvy3totwxHXpk7GAAAAAElFTkSuQmCC");
    ModAPI.meta.credits("By ZXMushroom63");
    ModAPI.meta.description("Adds various keybindings and features to add controller support.");
    ModAPI.require("player");
    var gamepad = null;
    window.addEventListener("gamepadconnected", (e) => {
        gamepad = e.gamepad;
        console.log("KMAP controller connected!", gamepad);
    });
    var isDebugBuild = true;
    var CURRENT_KMAP_PROFILE = "keyboard";
    const PROFILE_KEYBOARD = "keyboard";
    const PROFILE_CONTROLLER = "controller";
    const CONTROLLER_CONSTANT = 0x3000;
    const STICK_CONSTANT = 0x3100;
    const STICK_PRESS_SENSITIVITY = 0.5;
    const STICK_DRIFT_SUPPRESSION_FN = (x => ((Math.abs(x) > (ModAPI.settings.touchControlOpacity * 0.45))) ? x : 0);
    const DPAD_SPEED = 0.65;
    const isGuiControls = ModAPI.reflect.getClassById("net.minecraft.client.gui.GuiControls").instanceOf;
    const isGuiSlider = ModAPI.reflect.getClassById("net.minecraft.client.gui.GuiOptionSlider").instanceOf;
    const eaglerCanvas = document.querySelector("._eaglercraftX_canvas_element");
    const GAMEPAD_CURSOR = document.createElement("div");
    GAMEPAD_CURSOR.innerText = "⊹";
    GAMEPAD_CURSOR.style = `
    position:fixed;
    line-height: 16px;
    font-family: monospace;
    font-size: 16px;
    width: 16px;
    height: 16px;
    text-align: center;
    color: white;
    text-shadow: 0px 0px 4px black;
    top: 0px;
    left: 0px;
    z-index: 999;
    transform: translate(-8px, -9px) scale(2);
    user-select: none;
    display: none;
    pointer-events: none;
    `;
    document.body.appendChild(GAMEPAD_CURSOR);

    const CURSOR_POS = {
        x: window.innerWidth / 2 - 8,
        y: window.innerHeight / 2 - 8
    }

    function simulateMouseEvent(type, button = 0) {
        const event = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: CURSOR_POS.x,
            clientY: CURSOR_POS.y,
            button: button,
        });
        eaglerCanvas.dispatchEvent(event);
    }

    function simulateWheelEvent(deltaY) {
        const event = new WheelEvent("wheel", {
            deltaY: deltaY
        });
        eaglerCanvas.dispatchEvent(event);
    }

    function positionCursor() {
        // min constraint (top - left)
        CURSOR_POS.x = Math.max(0, CURSOR_POS.x);
        CURSOR_POS.y = Math.max(0, CURSOR_POS.y);

        // max constraight (bottom - right)
        CURSOR_POS.x = Math.min(window.innerWidth, CURSOR_POS.x);
        CURSOR_POS.y = Math.min(window.innerHeight, CURSOR_POS.y);

        GAMEPAD_CURSOR.style.left = CURSOR_POS.x + "px";
        GAMEPAD_CURSOR.style.top = CURSOR_POS.y + "px";
    }
    positionCursor();

    window.addEventListener("resize", () => {
        CURSOR_POS.x = window.innerWidth / 2 - 8;
        CURSOR_POS.y = window.innerHeight / 2 - 8;
        positionCursor();
    });

    function lerp(a, b, k) {
        return (b - a) * k + a;
    }

    const DEBUG_BIN = new Set();

    function button_utility_script2(inputArr, bindingClass, actionBindMode) {
        // By ZXMushroom63
        // action bind mode:
        // 0 - bind to the same as the binding class
        // 1 - do not bind
        // 2 - bind to GuiScreen
        actionBindMode ||= 0;
        var button = ModAPI.reflect.getClassById("net.minecraft.client.gui.GuiButton").constructors.find(x => x.length === 6);
        var originalActionPerformed = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage(actionBindMode === 2 ? "net.minecraft.client.gui.GuiScreen" : bindingClass, "actionPerformed")];
        var originalInit = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage(bindingClass, "initGui")];

        if (actionBindMode !== 1) {
            ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage(actionBindMode === 2 ? "net.minecraft.client.gui.GuiScreen" : bindingClass, "actionPerformed")] = function (...args) {
                var id = ModAPI.util.wrap(args[1]).getCorrective().id;
                var jsAction = inputArr.find(x => x.uid === id);
                if (jsAction) {
                    jsAction.click(ModAPI.util.wrap(args[0]), jsAction._btn);
                }
                return originalActionPerformed.apply(this, args);
            }
        }
        ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage(bindingClass, "initGui")] = function (...args) {
            originalInit.apply(this, args);
            var gui = ModAPI.util.wrap(args[0]).getCorrective();
            var buttons = inputArr.map(x => {
                if (x.getPos) {
                    var newPosition = x.getPos(gui);
                    x.x = newPosition[0];
                    x.y = newPosition[1];
                }
                var btn = button(x.uid, x.x, x.y, x.w, x.h, ModAPI.util.str(x.text));
                var btnWrapped = ModAPI.util.wrap(btn).getCorrective();
                (x.init || (() => { }))(btnWrapped);
                x._btn = btnWrapped;
                return btn;
            });
            buttons.forEach(guiButton => {
                gui.buttonList.add(guiButton);
            });
        }
    }

    function unpressAllKeys() {
        ModAPI.settings.keyBindings.forEach(kb => {
            kb.pressed = 0;
            kb.pressTime = 0;
        });
        oldClickState = false;
    }

    function serialiseKeybindingList(profile) {
        var out = {};
        ModAPI.settings.keyBindings.forEach(kb => {
            out[ModAPI.util.ustr(kb.keyDescription.getRef())] = kb.keyCode;
        });
        localStorage.setItem("eagX.controlmap." + profile, JSON.stringify(out));
        localStorage.setItem("eagX.controlmap.sens." + profile, ModAPI.settings.mouseSensitivity);
        localStorage.setItem("eagX.controlmap.tc." + profile, ModAPI.settings.touchControlOpacity);
    }

    function deserialiseKeybindingList(profile) {
        var input = localStorage.getItem("eagX.controlmap." + profile);
        if (!input) {
            return;
        }
        input = JSON.parse(input);
        ModAPI.settings.keyBindings.forEach(kb => {
            const keybinding = input[ModAPI.util.ustr(kb.keyDescription.getRef())];
            if (typeof keybinding === "number") {
                kb.keyCode = keybinding;
            }
        });

        if (parseFloat(localStorage.getItem("eagX.controlmap.sens." + profile))) {
            ModAPI.settings.mouseSensitivity = parseFloat(localStorage.getItem("eagX.controlmap.sens." + profile));
        }

        if (parseFloat(localStorage.getItem("eagX.controlmap.tc." + profile))) {
            ModAPI.settings.touchControlOpacity = parseFloat(localStorage.getItem("eagX.controlmap.tc." + profile));
        }

        if (isGuiControls(ModAPI.mc.currentScreen?.getRef())) {
            ModAPI.mc.currentScreen.getCorrective().buttonList.array.forEach(slider => {
                if (slider && isGuiSlider(slider.getRef())) {
                    slider = slider.getCorrective();
                    if (ModAPI.util.ustr(slider.options.enumString.getRef()) === "options.sensitivity") {
                        slider.sliderValue = ModAPI.settings.mouseSensitivity;
                        slider.displayString = ModAPI.mc.gameSettings.getKeyBinding(slider.options.getRef()).getRef();
                    }

                    if (ModAPI.util.ustr(slider.options.enumString.getRef()) === "options.touchControlOpacity") {
                        slider.sliderValue = ModAPI.settings.touchControlOpacity;
                        slider.displayString = ModAPI.mc.gameSettings.getKeyBinding(slider.options.getRef()).getRef();
                    }
                }
            });
        }

        ModAPI.reflect.getClassByName("KeyBinding").staticMethods.resetKeyBindingArrayAndHash.method();
    }
    var leftClickBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Left Click"),
        CONTROLLER_CONSTANT + 10,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(leftClickBind.getRef());
    var rightClickBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Right Click"),
        CONTROLLER_CONSTANT + 11,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(rightClickBind.getRef());
    var lookingBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Looking (any direction)"),
        STICK_CONSTANT + 0,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(lookingBind.getRef());
    var hotbarPreviousBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Hotbar Previous"),
        CONTROLLER_CONSTANT + 4,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(hotbarPreviousBind.getRef());
    var hotbarNextBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Hotbar Next"),
        CONTROLLER_CONSTANT + 5,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(hotbarNextBind.getRef());
    var shiftClickBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Shift Click"),
        0,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(shiftClickBind.getRef());
    const AUTOJUMP = false;
    var canTick = true;
    var processingShiftClick = false;
    function wait(ms) {
        return new Promise((res,rej)=>{
            setTimeout(()=>{res()}, ms);
        });
    }
    async function triggerShiftClick() {
        if (processingShiftClick) {
            return;
        }
        processingShiftClick = true;
        forceShiftKey = true;
        await wait(25);
        simulateMouseEvent("mousedown");
        await wait(25);
        simulateMouseEvent("mouseup");
        await wait(25);
        forceShiftKey = false;
        processingShiftClick = false;
    }
    ModAPI.addEventListener("update", () => {
        canTick = true;
        if (!ModAPI.player) {
            return;
        }
        if ((CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) && AUTOJUMP && ModAPI.player.onGround && ModAPI.player.isCollidedHorizontally) {
            ModAPI.promisify(ModAPI.player.jump)(); //lmao this caused a call stack implosion because it tries to trigger an achievement/stat XD
        }
        if (!ModAPI.mc.currentScreen) {
            if (hotbarPreviousBind.pressed && (hotbarPreviousBind.pressTime <= 0)) {
                hotbarPreviousBind.pressTime++;
                ModAPI.player.inventory.currentItem--;
                ModAPI.player.inventory.currentItem = ((ModAPI.player.inventory.currentItem + 1) || 9) - 1;
            }
            if (hotbarNextBind.pressed && (hotbarNextBind.pressTime <= 0)) {
                hotbarNextBind.pressTime++;
                ModAPI.player.inventory.currentItem++;
                ModAPI.player.inventory.currentItem %= 9;
            }
        }
        if (shiftClickBind.pressed && (shiftClickBind.pressTime <= 1) && ModAPI.mc.currentScreen) {
            triggerShiftClick();
        }
        delayFunctionQueue.forEach((x)=>x());
        delayFunctionQueue = [];
    });
    var stateMap = [];
    var stateMapAxes = [];
    function updateStateMap() {
        if (!gamepad) {
            return;
        }
        var axes = gamepad.axes.map(STICK_DRIFT_SUPPRESSION_FN);
        if (stateMap.length !== gamepad.buttons.length) {
            stateMap = (new Array(gamepad.buttons.length)).fill(false);
        }
        if (stateMapAxes.length !== axes.length) {
            stateMapAxes = (new Array(axes.length)).fill(false);
        }
        stateMap = gamepad.buttons.map(x => x.pressed);
        stateMapAxes = axes.map(x => Math.abs(x) > STICK_PRESS_SENSITIVITY);
    }
    const EnumChatFormatting = ModAPI.reflect.getClassByName("EnumChatFormatting");
    const RED = EnumChatFormatting.staticVariables.RED;
    var delayFunctionQueue = [];
    function processSpecialKeys(kb) {
        var desc = ModAPI.util.ustr(kb.keyDescription?.getRef() || null);
        if ((desc === "key.attack") && (ModAPI.mc.leftClickCounter <= 0)) {
            kb.blacklisted = true;
            delayFunctionQueue.push(()=>{
                ModAPI.mc.leftClickCounter = 1 + (5*(ModAPI.player?.capabilities?.isCreativeMode || 0));
            });
            return true;
        }
        if ((desc === "key.use") && (ModAPI.mc.rightClickDelayTimer <= 0)) {
            kb.blacklisted = true;
            delayFunctionQueue.push(()=>{
                ModAPI.mc.rightClickDelayTimer = 4;
            });
            kb.pressed = 1;
            kb.pressTime = 4;
            return false;
        } else if (desc === "key.use") {
            kb.pressed = 1;
            kb.pressTime = 0;
        }
        return false;
    }
    function gamepadLoop() {
        DEBUG_BIN.clear();
        const STICK_LMB_BTN = Math.max(leftClickBind.keyCode - CONTROLLER_CONSTANT, 0);
        const STICK_RMB_BTN = Math.max(rightClickBind.keyCode - CONTROLLER_CONSTANT, 0);
        const STICK_LOOK = getStickData(Math.max(lookingBind.keyCode - STICK_CONSTANT, 0) || 0);
        if (CURRENT_KMAP_PROFILE !== PROFILE_CONTROLLER) {
            return;
        }

        updateStateMap();
        if (!gamepad?.connected) {
            GAMEPAD_CURSOR.style.display = "none";
            return requestAnimationFrame(gamepadLoop);
        } else {
            updateStateMap();
            gamepad = navigator.getGamepads()[gamepad.index];
        }

        if (!gamepad?.connected) {
            return requestAnimationFrame(gamepadLoop);
        }

        DEBUG_BIN.add("RAW / " + gamepad.axes.toString());
        var axes = gamepad.axes.map(STICK_DRIFT_SUPPRESSION_FN);
        DEBUG_BIN.add("SUP / " + axes.toString());

        if (ModAPI.player && !ModAPI.mc.currentScreen) {
            GAMEPAD_CURSOR.style.display = "none";

            var coefficient = lerp(1.5, 15, ModAPI.settings.mouseSensitivity);

            if (ModAPI.settings.invertMouse) {
                coefficient *= -1;
            }

            ModAPI.player.rotationYaw += axes[STICK_LOOK.stick * 2 + 0] * ModAPI.settings.mouseSensitivity * coefficient;
            ModAPI.player.rotationPitch += axes[STICK_LOOK.stick * 2 + 1] * ModAPI.settings.mouseSensitivity * coefficient;
        } else if (!isGuiControls(ModAPI.mc.currentScreen?.getRef()) || !ModAPI.mc.currentScreen?.buttonId) {
            GAMEPAD_CURSOR.style.display = "block";

            var coefficient = lerp(7.5, 30, ModAPI.settings.mouseSensitivity);

            var stickX = axes[0];
            var stickY = axes[1];

            // up - down - left - right
            var dpad = [12, 13, 14, 15].map(k => gamepad.buttons[k].pressed);

            if (dpad.reduce((acc, v)=>acc||v)) {
                stickX = 0;
                stickY = 0;

                stickX += -1 * dpad[2];
                stickX += 1 * dpad[3];

                stickY += -1 * dpad[0];
                stickY += 1 * dpad[1];

                stickX *= DPAD_SPEED;
                stickY *= DPAD_SPEED;
            }

            simulateWheelEvent(75 * axes[3]);

            CURSOR_POS.x += stickX * coefficient;
            CURSOR_POS.y += stickY * coefficient;
            positionCursor();
            simulateMouseEvent("mousemove");
        }
        if (gamepad.buttons[STICK_LMB_BTN] && gamepad.buttons[STICK_LMB_BTN].pressed !== stateMap[STICK_LMB_BTN]) {
            if (gamepad.buttons[STICK_LMB_BTN].pressed) {
                simulateMouseEvent("mousedown");
            } else {
                simulateMouseEvent("mouseup");
            }
        }
        if (gamepad.buttons[STICK_RMB_BTN] && gamepad.buttons[STICK_RMB_BTN].pressed !== stateMap[STICK_RMB_BTN]) {
            if (gamepad.buttons[STICK_RMB_BTN].pressed) {
                simulateMouseEvent("mousedown", 2);
            } else {
                simulateMouseEvent("mouseup", 2);
            }
        }

        ModAPI.settings.keyBindings.forEach(kb => {
            if (["key.categories.movement", "key.categories.gameplay"].includes(ModAPI.util.ustr(kb.keyCategory?.getRef())) && ModAPI.mc.currentScreen) {
                return; //no moving while a gui is displayed
            }
            if (kb.keyCode >= STICK_CONSTANT) {
                var stickData = getStickData(kb.keyCode - STICK_CONSTANT);
                if (Math.sign(stickData.value) !== Math.sign(axes[stickData.index])) {
                    return; //conflicting directions (positive-negative)
                }
                var pressed = Math.abs(axes[stickData.index]) > Math.abs(stickData.value * STICK_PRESS_SENSITIVITY);
                kb.pressed = pressed * 1;
                if (pressed) {
                    if (processSpecialKeys(kb)) {
                        return;
                    }
                    kb.pressInitial ||= (kb.wasUnpressed);
                    kb.wasUnpressed = 0;
                    kb.pressTime += canTick;
                } else {
                    kb.wasUnpressed = 1;
                    kb.pressTime = 0;
                    kb.pressInitial = 0;
                }
                return;
            }
            if (kb.keyCode >= CONTROLLER_CONSTANT) {
                var keyCode = kb.keyCode - CONTROLLER_CONSTANT;
                if (gamepad.buttons[keyCode]) {
                    kb.pressed = gamepad.buttons[keyCode].pressed * 1;
                    if (gamepad.buttons[keyCode].pressed) {
                        if (processSpecialKeys(kb)) {
                            return;
                        }
                        kb.pressInitial ||= (kb.wasUnpressed);
                        kb.wasUnpressed = 0;
                        kb.pressTime += canTick;
                    } else {
                        kb.wasUnpressed = 1;
                        kb.pressTime = 0;
                        kb.pressInitial = 0;
                    }
                }
                return;
            }
        });
        canTick = false;
        if (isGuiControls(ModAPI.mc.currentScreen?.getRef())) {
            EnumChatFormatting.staticVariables.RED = EnumChatFormatting.staticVariables.WHITE;
            for (let k = 0; k < gamepad.buttons.length; k++) {
                if (gamepad.buttons[k].pressed && !stateMap[k]) {
                    ModAPI.mc.currentScreen.keyTyped(k + CONTROLLER_CONSTANT, k + CONTROLLER_CONSTANT);
                    break;
                }
            }
            for (let k = 0; k < axes.length; k++) {
                if ((Math.abs(axes[k]) > STICK_PRESS_SENSITIVITY) && !stateMapAxes[k]) {
                    var idx = axisToIdx(axes[k], k);
                    ModAPI.mc.currentScreen.keyTyped(idx + STICK_CONSTANT, idx + STICK_CONSTANT);
                    break;
                }
            }
        } else {
            EnumChatFormatting.staticVariables.RED = RED;
        }

        if (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) {
            requestAnimationFrame(gamepadLoop);
        }
    }

    function getButtonName(buttonIndex) {
        const buttonNames = [
            'Gamepad A',        // 0
            'Gamepad B',        // 1
            'Gamepad X',        // 2
            'Gamepad Y',        // 3
            'Gamepad LB',       // 4
            'Gamepad RB',       // 5
            'Gamepad LT',       // 6
            'Gamepad RT',       // 7
            'Gamepad Back',     // 8
            'Gamepad Start',    // 9
            'Gamepad LS',       // 10 (Left Stick)
            'Gamepad RS',       // 11 (Right Stick)
            'DPad-Up',  // 12
            'DPad-Down',// 13
            'DPad-Left',// 14
            'DPad-Right'// 15
        ];

        if (buttonIndex < 0 || buttonIndex >= buttonNames.length) {
            return 'Gamepad #' + buttonIndex;
        }

        return buttonNames[buttonIndex];
    }
    function axisToIdx(axis, idx) {
        var base = Math.floor(idx / 2) * 4;
        var isVertical = idx % 2;
        var isPositive = axis > 0;
        if (isPositive && !isVertical) {
            return base;
        }
        if (isPositive && isVertical) {
            return base + 1;
        }
        if (!isPositive && !isVertical) {
            return base + 2;
        }
        if (!isPositive && isVertical) {
            return base + 3;
        }
    }
    function getStickData(idx) {
        const radians = 90 * (Math.PI / 180);
        const stick = Math.floor(idx / 4);
        const DX = Math.round(Math.cos((idx % 4) * radians));
        const DY = Math.round(Math.sin((idx % 4) * radians));
        const direction = ({
            "1,0": "Right",
            "0,1": "Down",
            "-1,0": "Left",
            "0,-1": "Up"
        })[
            [DX, DY].join(",")
        ];
        const name = "Stick #" + Math.floor(idx / 4) + " " + direction;
        const index = stick * 2 + Math.abs(DY);
        const value = idx % 2 ? DY : DX;
        return {
            stick: stick,
            dx: DX,
            dy: DY,
            direction: direction,
            index: index,
            name: name,
            value: value
        }
    }

    const oldGetKeyDisplayString = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settins.GameSettings", "getKeyDisplayString")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settins.GameSettings", "getKeyDisplayString")] = function (keyCode) {
        if (keyCode === 0) {
            return ModAPI.util.str("(none)");
        }
        if ((!keyCode) || (keyCode < CONTROLLER_CONSTANT)) {
            return oldGetKeyDisplayString.apply(this, [keyCode]);
        }
        if (keyCode >= STICK_CONSTANT) {
            return ModAPI.util.str(getStickData(keyCode - STICK_CONSTANT).name);
        }
        return ModAPI.util.str(getButtonName(keyCode - CONTROLLER_CONSTANT));
    }

    const oldGetSliderTextString = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "getKeyBinding")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "getKeyBinding")] = function ($this, option) {
        if (!option) {
            return oldGetSliderTextString.apply(this, [$this, option]);
        }
        var id = ModAPI.util.ustr(ModAPI.util.wrap(option).getCorrective().name().getRef());
        if ((id === "EAGLER_TOUCH_CONTROL_OPACITY") && (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER)) {
            var value = ModAPI.settings.getOptionFloatValue(option);
            return ModAPI.util.str("Stick Drift Suppression: " + (value * 100).toFixed(0) + "%");
        }
        return oldGetSliderTextString.apply(this, [$this, option]);
    }

    const oldKbIsPressed = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.KeyBinding", "isPressed")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.KeyBinding", "isPressed")] = function ($this) {
        if ((CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) && !$this.$blacklisted) {
            var x = $this.$pressInitial;
            $this.$pressInitial = 0;
            return x;
        }
        return oldKbIsPressed.apply(this, [$this]);
    }

    const oldRenderIngameGui = ModAPI.hooks.methods["nmcg_GuiIngame_renderGameOverlay"];
    ModAPI.hooks.methods["nmcg_GuiIngame_renderGameOverlay"] = function ($this, f) {
        oldRenderIngameGui.apply(this, [$this, f]);
        if (isDebugBuild) {
            [...DEBUG_BIN].forEach((debugString, i) => {
                if (!ModAPI.util.isCritical()) {
                    ModAPI.mc.fontRendererObj.renderString(ModAPI.util.str(debugString || ""), 0, 36 + 12*i, 0xFF0000, 1);
                }
            });
        }
    };
    function loadProfile(profile, burn) {
        EnumChatFormatting.staticVariables.RED = RED;
        if (CURRENT_KMAP_PROFILE === profile) {
            return;
        }

        unpressAllKeys();
        if (!burn) {
            serialiseKeybindingList(CURRENT_KMAP_PROFILE);
        }
        CURRENT_KMAP_PROFILE = profile;
        deserialiseKeybindingList(CURRENT_KMAP_PROFILE);

        if (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
                if (gp && gp.connected) {
                    gamepad = gp;
                    break;
                }
            }
            gamepadLoop();
        }
        simulateMouseEvent("mouseup");
        GAMEPAD_CURSOR.style.display = "none";
    }
    var KEYBOARD_BUTTON = null;
    var CONTROLLER_BUTTON = null;
    var profileButtons = [
        {
            text: "Keyboard",
            click: (gui, btn) => {
                loadProfile(PROFILE_KEYBOARD);
                if (btn) {
                    btn.enabled = 1 * (CURRENT_KMAP_PROFILE !== PROFILE_KEYBOARD);
                }
                if (CONTROLLER_BUTTON) {
                    CONTROLLER_BUTTON.enabled = 1;
                }
            },
            getPos: (gui) => {
                return [
                    (gui.width / 2) + 5,
                    42
                ]
            },
            init: (btn) => {
                KEYBOARD_BUTTON = btn;
                btn.enabled = 1 * (CURRENT_KMAP_PROFILE !== PROFILE_KEYBOARD);
            },
            w: 75,
            h: 20,
            uid: 14275427
        },
        {
            text: "Controller",
            click: (gui, btn) => {
                loadProfile(PROFILE_CONTROLLER);
                if (btn) {
                    btn.enabled = 1 * (CURRENT_KMAP_PROFILE !== PROFILE_CONTROLLER);
                }
                if (KEYBOARD_BUTTON) {
                    KEYBOARD_BUTTON.enabled = 1;
                }
            },
            getPos: (gui) => {
                return [
                    (gui.width / 2) + 80,
                    42
                ]
            },
            init: (btn) => {
                CONTROLLER_BUTTON = btn;
                btn.enabled = 1 * (CURRENT_KMAP_PROFILE !== PROFILE_CONTROLLER);
            },
            w: 75,
            h: 20,
            uid: 14275428
        }
    ];
    button_utility_script2(profileButtons, "net.minecraft.client.gui.GuiControls", 0);

    loadProfile(PROFILE_KEYBOARD, true);

    window.addEventListener("beforeunload", () => {
        loadProfile(PROFILE_KEYBOARD);
    }, true);
    var forceShiftKey = false;
    const oldIsShiftEntry = ModAPI.hooks.methods["nlevi_PlatformInput_keyboardIsKeyDown"];
    ModAPI.hooks.methods["nlevi_PlatformInput_keyboardIsKeyDown"] = function (...args) {
        return (((args[0] === 42) && forceShiftKey) * 1) || oldIsShiftEntry.apply(this, args);
    }
})();