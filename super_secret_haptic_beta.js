(function () {
    ModAPI.meta.title("🎮 EaglerConsole | Controller Support");
    ModAPI.meta.version("v1.2b-haptic-0");
    ModAPI.meta.icon("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAANCAYAAACgu+4kAAAAAXNSR0IArs4c6QAAAPhJREFUOE+NkrEKgzAQhv+AOAguOnTQ1yjduoiufQkfy5foanHpVvoaOhR0EhxUSMnRhCRNSrNcjrv77v7kGD6nrmsu78I2TcN03xenpL7veZZlej6GYTB8FX9VwKGleJ7njOnF0zRRUZqmZJdlQRiGCIKA/OoBtCcAZQncbgRRAFE8zzO2bUOSJATZ9x3ruiKKIjXN8X7B83wl3wkQgTiO1RSGDssxACKmSyiKAl3XUQljjHHOuS3xCyAbyGJpBWAcR25L9AIEyJ5AAnSJPwGub/xbgvxj/c18u2LsgfwasSCu17chJMHeRFd3CdMBahP1oLj7uvvy3totwxHXpk7GAAAAAElFTkSuQmCC");
    ModAPI.meta.credits("By ZXMushroom63 & elijahcg314");
    ModAPI.meta.description("Adds various keybindings and features for controller support.");
    ModAPI.require("player");
    var gamepad = null;
    window.addEventListener("gamepadconnected", (e) => {
        gamepad = e.gamepad;
        console.log("KMAP controller connected!", gamepad);
    });
    var isDebugBuild = (new URLSearchParams(location.search)).has("controller_debug_mode");

    const LF = String.fromCharCode(10);
    ModAPI.addCredit("Eagler Controller Support Mod", "ZXMushroom63",
        "  - Coded the mod" + LF +
        "  - Almost had an aneurism" + LF +
        "  - At least it works now");
    ModAPI.addCredit("Eagler Controller Support Mod", "elijahc314",
        "  - Playtested the mod" + LF +
        "  - Got ZXMushroom63 to do any amount of work" + LF +
        "  - Threw a fat list of bug reports at ZXMushroom63");

    var CURRENT_KMAP_PROFILE = "keyboard";
    const PROFILE_KEYBOARD = "keyboard";
    const PROFILE_CONTROLLER = "controller";
    const CONTROLLER_CONSTANT = 0x3000;
    const STICK_CONSTANT = 0x3100;
    const STICK_PRESS_SENSITIVITY = 0.5;
    var stickDriftSuppression = 0;
    const STICK_DRIFT_SUPPRESSION_FN = (x => ((Math.abs(x) > (stickDriftSuppression * 0.76))) ? x : 0);
    const DPAD_SPEED = 0.65;
    const isGuiControls = ModAPI.reflect.getClassById("net.minecraft.client.gui.GuiControls").instanceOf;
    const isGuiChat = ModAPI.reflect.getClassById("net.minecraft.client.gui.GuiChat").instanceOf;
    const isGuiSlider = ModAPI.reflect.getClassById("net.minecraft.client.gui.GuiOptionSlider").instanceOf;
    const isGuiOptionButton = ModAPI.reflect.getClassById("net.minecraft.client.gui.GuiOptionButton").instanceOf;
    const eaglerCanvas = document.querySelector("._eaglercraftX_canvas_element");
    const GAMEPAD_CURSOR = document.createElement("div");
    const CONTROLLER_DEFAULTS = {
        "key.attack": 7 + CONTROLLER_CONSTANT,
        "key.use": 6 + CONTROLLER_CONSTANT,
        "key.forward": 3 + STICK_CONSTANT,
        "key.left": 2 + STICK_CONSTANT,
        "key.back": 1 + STICK_CONSTANT,
        "key.right": 0 + STICK_CONSTANT,
        "key.jump": 0 + CONTROLLER_CONSTANT,
        "key.sneak": 11 + CONTROLLER_CONSTANT,
        "key.sprint": 10 + CONTROLLER_CONSTANT,
        "key.drop": 13 + CONTROLLER_CONSTANT,
        "key.inventory": 3 + CONTROLLER_CONSTANT,
        "key.chat": 15 + CONTROLLER_CONSTANT,
        "key.playerlist": 8 + CONTROLLER_CONSTANT,
        "key.pickItem": 0,
        "key.command": 0,
        "key.screenshot": 0,
        "key.togglePerspective": 12 + CONTROLLER_CONSTANT,
        "key.smoothCamera": 0,
        "key.zoomCamera": 0,
        "key.function": 0,
        "key.close": 9 + CONTROLLER_CONSTANT,
        "key.hotbar.1": 0,
        "key.hotbar.2": 0,
        "key.hotbar.3": 0,
        "key.hotbar.4": 0,
        "key.hotbar.5": 0,
        "key.hotbar.6": 0,
        "key.hotbar.7": 0,
        "key.hotbar.8": 0,
        "key.hotbar.9": 0,
        "Left Click": 0 + CONTROLLER_CONSTANT,
        "Right Click": 0,
        "Looking (any direction)": 4 + STICK_CONSTANT,
        "Hotbar Previous": 4 + CONTROLLER_CONSTANT,
        "Hotbar Next": 5 + CONTROLLER_CONSTANT,
        "Shift Click": 0,
        "Open Settings": 9 + CONTROLLER_CONSTANT,
        "Parent Screen / Back": 1 + CONTROLLER_CONSTANT,
        "Exit Chat": 1 + CONTROLLER_CONSTANT,
        "Send Chat": 0 + CONTROLLER_CONSTANT,
    };
    // 1 + CONTROLLER_CONSTANT = exit chat
    // 0 + CONTROLLER_CONSTANT = chat simulate enter key (.keyTyped)
    // 1 + CONTROLLER_CONSTANT = done button
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
    text-shadow: 0px 0px 2px black;
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

    function unpressKb(kb, ghostMode) {
        kb.pressed = 0;
        if (ghostMode) {
            kb.wasUnpressed = 0;
        } else {
            kb.wasUnpressed = 1;
        }
        kb.pressTime = 0;
        kb.pressInitial = 0;
        kb.pressTimeRaw = 0;
    }

    function unpressAllKeys(ghostMode) {
        ModAPI.settings.keyBindings.forEach(kb => {
            unpressKb(kb, ghostMode);
        });
        oldClickState = false;
        simulateMouseEvent("mouseup");
        simulateMouseEvent("mouseup", 2);
    }

    function serialiseKeybindingList(profile) {
        var out = {};
        ModAPI.settings.keyBindings.forEach(kb => {
            out[ModAPI.util.ustr(kb.keyDescription.getRef())] = kb.keyCode;
        });
        localStorage.setItem("eagX.controlmap." + profile, JSON.stringify(out));
        localStorage.setItem("eagX.controlmap.sens." + profile, ModAPI.settings.mouseSensitivity);
        if (profile === PROFILE_CONTROLLER) {
            localStorage.setItem("eagX.controlmap.tc." + profile, stickDriftSuppression);
        } else {
            localStorage.setItem("eagX.controlmap.tc." + profile, ModAPI.settings.touchControlOpacity);
        }
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

        ModAPI.settings.mouseSensitivity = parseFloat(localStorage.getItem("eagX.controlmap.sens." + profile)) || 0;

        stickDriftSuppression = parseFloat(localStorage.getItem("eagX.controlmap.tc." + profile)) || 0.3;
        if (profile !== PROFILE_CONTROLLER) {
            ModAPI.settings.touchControlOpacity = parseFloat(localStorage.getItem("eagX.controlmap.tc." + profile)) || 0;
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
                        slider.sliderValue = (profile === PROFILE_CONTROLLER) ? stickDriftSuppression : ModAPI.settings.touchControlOpacity;
                        slider.displayString = ModAPI.mc.gameSettings.getKeyBinding(slider.options.getRef()).getRef();
                    }
                }
                if (slider && isGuiOptionButton(slider.getRef())) {
                    slider = slider.getCorrective();
                    if (ModAPI.util.ustr(slider.enumOptions.enumString.getRef()) === "options.invertMouse") {
                        slider.displayString = ModAPI.mc.gameSettings.getKeyBinding(slider.enumOptions.getRef()).getRef();
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

    var openSettingsBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Open Settings"),
        0,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(openSettingsBind.getRef());

    var parentScreenBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Parent Screen / Back"),
        0,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(parentScreenBind.getRef());

    var exitChatBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Exit Chat"),
        0,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(exitChatBind.getRef());

    var sendChatBind = ModAPI.util.wrap(ModAPI.reflect.getClassById("net.minecraft.client.settings.KeyBinding").constructors[0](
        ModAPI.util.str("Send Chat"),
        0,
        ModAPI.util.str("Gamepad Support")
    ));
    ModAPI.settings.keyBindings.push(sendChatBind.getRef());

    ModAPI.settings.keyBindings.forEach(kb => {
        if (!kb) {
            return;
        }
        var raw = kb.getRef();
        var originalDefault = kb.keyCodeDefault;
        var controllerDefault = CONTROLLER_DEFAULTS[ModAPI.util.ustr(kb.keyDescription.getRef())];
        Object.defineProperty(raw, "$keyCodeDefault", {
            get: function () {
                return (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) ? controllerDefault : originalDefault;
            }
        });
    });

    ModAPI.settings.keyBindChat.specialPreventionCondition = () => ModAPI.mc.currentScreen !== null;

    const AUTOJUMP = false;
    var canTick = true;
    var processingShiftClick = false;
    function wait(ms) {
        return new Promise((res, rej) => {
            setTimeout(() => { res() }, ms);
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
        nextCanRun = true;
        if (!ModAPI.player) {
            return;
        }
        if ((CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) && AUTOJUMP && ModAPI.player.onGround && ModAPI.player.isCollidedHorizontally) {
            ModAPI.promisify(ModAPI.player.jump)(); //lmao this caused a call stack implosion because it tries to trigger an achievement/stat XD
        }
        if (!ModAPI.mc.currentScreen) {
            if (hotbarPreviousBind.pressed && ((hotbarPreviousBind.pressTimeRaw === 1) || (Math.max(hotbarPreviousBind.pressTimeRaw - 5, 0) % 2 === 1))) {
                ModAPI.player.inventory.currentItem--;
                ModAPI.player.inventory.currentItem = ((ModAPI.player.inventory.currentItem + 1) || 9) - 1;
            }
            if (hotbarNextBind.pressed && ((hotbarNextBind.pressTimeRaw === 1) || (Math.max(hotbarNextBind.pressTimeRaw - 5, 0) % 2 === 1))) {
                ModAPI.player.inventory.currentItem++;
                ModAPI.player.inventory.currentItem %= 9;
            }
        }
        if (shiftClickBind.pressed && (shiftClickBind.pressTime <= 1) && ModAPI.mc.currentScreen) {
            triggerShiftClick();
        }
        delayFunctionQueue.forEach((x) => x());
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
            delayFunctionQueue.push(() => {
                ModAPI.mc.leftClickCounter = 1 + (5 * (ModAPI.player?.capabilities?.isCreativeMode || 0));
            });
            kb.pressed = 1;
            kb.pressTime = 4;
            return false;
        } else if (desc === "key.attack") {
            kb.pressed = 1;
            kb.pressTime = 0;
        }
        return false;
    }
    function getParentScreen(gui) {
        var guiWrapped = gui.getCorrective();

        return guiWrapped.parentScreen ||
            guiWrapped.parentGuiScreen ||
            guiWrapped.field_146441_g ||
            guiWrapped.parent;
    }
    var oldTime = Date.now();
    function gamepadLoop() {
        var now = Date.now();
        var deltaTime = (now - oldTime) / 1000 * 60;
        oldTime = now;
        DEBUG_BIN.clear();
        const STICK_LMB_BTN = Math.max(leftClickBind.keyCode - CONTROLLER_CONSTANT, -1);
        const STICK_RMB_BTN = Math.max(rightClickBind.keyCode - CONTROLLER_CONSTANT, -1);
        const STICK_LOOK = getStickData((lookingBind.keyCode - STICK_CONSTANT) || 0);
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

            if (STICK_LOOK) {
                var coefficient = lerp(1.5, 15, ModAPI.settings.mouseSensitivity);

                if (ModAPI.settings.invertMouse) {
                    coefficient *= -1;
                }

                coefficient *= deltaTime;

                ModAPI.player.rotationYaw += axes[STICK_LOOK.stick * 2 + 0] * ModAPI.settings.mouseSensitivity * coefficient;
                ModAPI.player.rotationPitch += axes[STICK_LOOK.stick * 2 + 1] * ModAPI.settings.mouseSensitivity * coefficient;

                ModAPI.player.rotationPitch = Math.min(ModAPI.player.rotationPitch, 90);
                ModAPI.player.rotationPitch = Math.max(ModAPI.player.rotationPitch, -90);
            }

            if (openSettingsBind.isPressed()) {
                ModAPI.mc.displayInGameMenu();
            }
        } else if (!isGuiControls(ModAPI.mc.currentScreen?.getRef()) || !ModAPI.mc.currentScreen?.buttonId) {
            GAMEPAD_CURSOR.style.display = "block";

            var coefficient = lerp(7.5, 30, ModAPI.settings.mouseSensitivity);

            coefficient *= deltaTime;

            var stickX = axes[0];
            var stickY = axes[1];

            // up - down - left - right
            var dpad = [12, 13, 14, 15].map(k => gamepad.buttons[k].pressed);

            if (dpad.reduce((acc, v) => acc || v)) {
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

            if (parentScreenBind.isPressed()
                && ModAPI.mc.currentScreen
                && (
                    getParentScreen(ModAPI.mc.currentScreen)
                    || ModAPI.player
                )
                // && (
                //     !isGuiControls(ModAPI.mc.currentScreen?.getRef())
                // )
            ) {
                ModAPI.promisify(ModAPI.mc.displayGuiScreen)(
                    getParentScreen(ModAPI.mc.currentScreen)
                        ? getParentScreen(ModAPI.mc.currentScreen).getRef()
                        : null
                );
            }
        } else if (isGuiControls(ModAPI.mc.currentScreen?.getRef()) && ModAPI.mc.currentScreen?.buttonId) {
            unpressAllKeys(true);
        }

        if (ModAPI.mc.currentScreen && (!ModAPI.mc.currentScreen?.buttonId)) {
            if ((STICK_LMB_BTN !== -1) && gamepad.buttons[STICK_LMB_BTN] && gamepad.buttons[STICK_LMB_BTN].pressed !== stateMap[STICK_LMB_BTN]) {
                if (gamepad.buttons[STICK_LMB_BTN].pressed) {
                    simulateMouseEvent("mousedown");
                } else {
                    simulateMouseEvent("mouseup");
                }
            }
            if ((STICK_RMB_BTN !== -1) && gamepad.buttons[STICK_RMB_BTN] && gamepad.buttons[STICK_RMB_BTN].pressed !== stateMap[STICK_RMB_BTN]) {
                if (gamepad.buttons[STICK_RMB_BTN].pressed) {
                    simulateMouseEvent("mousedown", 2);
                } else {
                    simulateMouseEvent("mouseup", 2);
                }
            }
        }

        if (isGuiChat(ModAPI.mc.currentScreen?.getRef())) {
            if (exitChatBind.isPressed()) {
                ModAPI.mc.displayGuiScreen(null);
            }
            if (sendChatBind.isPressed()) {
                ModAPI.mc.currentScreen.keyTyped(28, 28);
            }
        }

        ModAPI.settings.keyBindings.forEach(kb => {
            if (["key.categories.movement", "key.categories.gameplay"].includes(ModAPI.util.ustr(kb.keyCategory?.getRef())) && ModAPI.mc.currentScreen) {
                return; //no moving while a gui is displayed
            }
            kb.pressTimeRaw ||= 0;
            if (kb.keyCode >= STICK_CONSTANT) {
                var stickData = getStickData(kb.keyCode - STICK_CONSTANT);
                if (!stickData) {
                    unpressKb(kb);
                    return; //unbound
                }
                if (Math.sign(stickData.value) !== Math.sign(axes[stickData.index])) {
                    unpressKb(kb);
                    return; //conflicting directions (positive-negative)
                }
                var pressed = Math.abs(axes[stickData.index]) > Math.abs(stickData.value * STICK_PRESS_SENSITIVITY);
                kb.pressed = pressed * 1;
                DEBUG_BIN.add(ModAPI.util.ustr(kb.keyDescription?.getRef()) + " s= " + kb.pressed + " | " + kb.pressInitial);
                if (pressed) {
                    if (processSpecialKeys(kb)) {
                        return;
                    }
                    var preventFlag = false;
                    if (kb.specialPreventionCondition) {
                        preventFlag = kb.specialPreventionCondition();
                    }
                    kb.pressInitial ||= kb.wasUnpressed && !kb.preventDefaultBehaviour && !preventFlag;
                    kb.wasUnpressed = 0;
                    if (!kb.preventDefaultBehaviour) {
                        kb.pressTime += canTick;
                    }
                    kb.pressTimeRaw += canTick;
                } else {
                    unpressKb(kb);
                }
                return;
            }
            if (kb.keyCode >= CONTROLLER_CONSTANT) {
                var keyCode = kb.keyCode - CONTROLLER_CONSTANT;
                if (gamepad.buttons[keyCode]) {
                    kb.pressed = gamepad.buttons[keyCode].pressed * 1;
                    DEBUG_BIN.add(ModAPI.util.ustr(kb.keyDescription?.getRef()) + " b= " + kb.pressed + " | " + kb.pressInitial);
                    if (gamepad.buttons[keyCode].pressed) {
                        if (processSpecialKeys(kb)) {
                            return;
                        }
                        var preventFlag = false;
                        if (kb.specialPreventionCondition) {
                            preventFlag = kb.specialPreventionCondition();
                        }
                        kb.pressInitial ||= kb.wasUnpressed && !kb.preventDefaultBehaviour && !preventFlag;
                        kb.wasUnpressed = 0;
                        if (!kb.preventDefaultBehaviour) {
                            kb.pressTime += canTick;
                        }
                        kb.pressTimeRaw += canTick;
                    } else {
                        unpressKb(kb);
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
                    ModAPI.promisify(ModAPI.mc.currentScreen.keyTyped)(k + CONTROLLER_CONSTANT, k + CONTROLLER_CONSTANT);
                    break;
                }
            }
            for (let k = 0; k < axes.length; k++) {
                if ((Math.abs(axes[k]) > STICK_PRESS_SENSITIVITY) && !stateMapAxes[k]) {
                    var idx = axisToIdx(axes[k], k);
                    ModAPI.promisify(ModAPI.mc.currentScreen.keyTyped)(idx + STICK_CONSTANT, idx + STICK_CONSTANT);
                    break;
                }
            }
        } else if (ModAPI.mc.currentScreen) {
            EnumChatFormatting.staticVariables.RED = RED;

            for (let k = 0; k < gamepad.buttons.length; k++) {
                if (gamepad.buttons[k].pressed && !stateMap[k]) {
                    delayFunctionQueue.push(() => {
                        if (!ModAPI.mc.currentScreen) {
                            return;
                        }
                        ModAPI.promisify(ModAPI.mc.currentScreen.keyTyped)(0, k + CONTROLLER_CONSTANT);
                    });
                    break;
                }
            }
            for (let k = 0; k < axes.length; k++) {
                if ((Math.abs(axes[k]) > STICK_PRESS_SENSITIVITY) && !stateMapAxes[k]) {
                    var idx = axisToIdx(axes[k], k);
                    delayFunctionQueue.push(() => {
                        if (!ModAPI.mc.currentScreen) {
                            return;
                        }
                        ModAPI.promisify(ModAPI.mc.currentScreen.keyTyped)(0, idx + STICK_CONSTANT);
                    });
                    break;
                }
            }
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
            'Gamepad L3',       // 10 (Left Stick)
            'Gamepad R3',       // 11 (Right Stick)
            'D-Pad Up',  // 12
            'D-Pad Down',// 13
            'D-Pad Left',// 14
            'D-Pad Right',// 15
            'Gamepad Home',//16
            'Touch Pad'//17
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
        if (idx < 0) {
            return null;
        }
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

        var basename;
        if (Math.floor(idx / 4) < 2) {
            basename = (Math.floor(idx / 4) === 0) ? "LS" : "RS"
        } else {
            basename = "Stick #" + (Math.floor(idx / 4) + 1);
        }
        const name = basename + " " + direction;

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
            return ModAPI.util.str(getStickData(keyCode - STICK_CONSTANT)?.name || "(none)");
        }
        return ModAPI.util.str(getButtonName(keyCode - CONTROLLER_CONSTANT));
    }

    const oldGetSliderTextString = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "getKeyBinding")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "getKeyBinding")] = function ($this, option) {
        if (!option) {
            return oldGetSliderTextString.apply(this, [$this, option]);
        }
        var id = ModAPI.util.ustr(ModAPI.util.wrap(option).getCorrective().name.getRef());
        if ((id === "EAGLER_TOUCH_CONTROL_OPACITY") && (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER)) {
            var value = stickDriftSuppression;
            return ModAPI.util.str("Stick Drift Suppression: " + (value * 100).toFixed(0) + "%");
        }
        if ((id === "INVERT_MOUSE") && (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER)) {
            return ModAPI.util.str("Invert Stick: " + (ModAPI.settings.invertMouse ? "ON" : "OFF"));
        }
        return oldGetSliderTextString.apply(this, [$this, option]);
    }

    const oldSetSliderValue = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "setOptionFloatValue")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "setOptionFloatValue")] = function ($this, option, value) {
        if (!option) {
            return oldSetSliderValue.apply(this, [$this, option, value]);
        }
        var id = ModAPI.util.ustr(ModAPI.util.wrap(option).getCorrective().name.getRef());
        if ((id === "EAGLER_TOUCH_CONTROL_OPACITY") && (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER)) {
            stickDriftSuppression = value;
            return;
        }
        return oldSetSliderValue.apply(this, [$this, option, value]);
    }

    const oldGetSliderValue = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "getOptionFloatValue")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.settings.GameSettings", "getOptionFloatValue")] = function ($this, option) {
        if (!option) {
            return oldGetSliderValue.apply(this, [$this, option]);
        }
        var id = ModAPI.util.ustr(ModAPI.util.wrap(option).getCorrective().name.getRef());
        if ((id === "EAGLER_TOUCH_CONTROL_OPACITY") && (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER)) {
            return stickDriftSuppression;
        }
        return oldGetSliderValue.apply(this, [$this, option]);
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

    const oldRightClickMouse = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.Minecraft", "rightClickMouse")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.Minecraft", "rightClickMouse")] = function ($this) {
        if ((CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) && ModAPI.mc.rightClickDelayTimer !== 0) {
            return;
        }
        return oldRightClickMouse.apply(this, [$this]);
    }

    const oldRenderIngameGui = ModAPI.hooks.methods["nmcg_GuiIngame_renderGameOverlay"];
    ModAPI.hooks.methods["nmcg_GuiIngame_renderGameOverlay"] = function ($this, f) {
        oldRenderIngameGui.apply(this, [$this, f]);
        if (isDebugBuild) {
            [...DEBUG_BIN].forEach((debugString, i) => {
                if (!ModAPI.util.isCritical()) {
                    ModAPI.mc.fontRendererObj.renderString(ModAPI.util.str(debugString || ""), 0, 36 + 12 * i, 0xFF0000, 1);
                }
            });
        }
    };

    function isActiveKey() {
        return ModAPI.settings.keyBindings.map(kb => kb.pressInitial).reduce((acc, state) => acc || state);
    }

    const oldKeyboardGetKeyState = ModAPI.hooks.methods["nlev_Keyboard_getEventKeyState"];
    ModAPI.hooks.methods["nlev_Keyboard_getEventKeyState"] = function () {
        if ((CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) && isActiveKey()) {
            return 1;
        }
        var x = oldKeyboardGetKeyState.apply(this, []);
        return x;
    };
    var nextCanRun = true;
    const oldKeyboardNext = ModAPI.hooks.methods["nlev_Keyboard_next"];
    ModAPI.hooks.methods["nlev_Keyboard_next"] = function () {
        if ((CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) && isActiveKey() && nextCanRun) {
            nextCanRun = false;
            return 1;
        }
        var x = oldKeyboardNext.apply(this, []);
        return x;
    };

    const oldActionPerformed = ModAPI.hooks.methods["nmcg_GuiControls_actionPerformed"];
    ModAPI.hooks.methods["nmcg_GuiControls_actionPerformed"] = function ($this, $button) {
        oldActionPerformed.apply(this, [$this, $button]);
        var btnId = $button ? ModAPI.util.wrap($button).getCorrective().id : null;
        if (btnId === 201) {
            unpressAllKeys();
        }
    };
    function loadProfile(profile, burn) {
        EnumChatFormatting.staticVariables.RED = RED;
        if ((CURRENT_KMAP_PROFILE === profile) && !burn) {
            return;
        }

        unpressAllKeys();

        if (!burn) {
            serialiseKeybindingList(CURRENT_KMAP_PROFILE);
        }
        CURRENT_KMAP_PROFILE = profile;
        deserialiseKeybindingList(CURRENT_KMAP_PROFILE);

        if (CURRENT_KMAP_PROFILE === PROFILE_CONTROLLER) {
            EnumChatFormatting.staticVariables.RED = EnumChatFormatting.staticVariables.WHITE;
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

    window.addEventListener("beforeunload", () => {
        serialiseKeybindingList(CURRENT_KMAP_PROFILE);
    }, true);

    loadProfile(PROFILE_KEYBOARD, true);

    var forceShiftKey = false;
    const oldIsShiftEntry = ModAPI.hooks.methods["nlevi_PlatformInput_keyboardIsKeyDown"];
    ModAPI.hooks.methods["nlevi_PlatformInput_keyboardIsKeyDown"] = function (...args) {
        return (((args[0] === 42) && forceShiftKey) * 1) || oldIsShiftEntry.apply(this, args);
    }
    const CONTROLLER_HAPTIC_FEEDBACK = {
        "inFire": {
            intensity: 0.6,
            duration: 0.2
        },
        "lightningBolt": {
            intensity: 1,
            duration: 0.6
        },
        "onFire": {
            intensity: 0.3,
            duration: 0.2
        },
        "lava": {
            intensity: 0.6,
            duration: 0.2
        },
        "inWall": {
            intensity: 0.3,
            duration: 0.2
        },
        "drown": {
            intensity: 0.3,
            duration: 0.2
        },
        "starve": {
            intensity: 0.3,
            duration: 0.2
        },
        "cactus": {
            intensity: 0.3,
            duration: 0.2
        },
        "outOfWorld": {
            intensity: 1,
            duration: 0.2
        },
        "generic": {
            intensity: 0.3,
            duration: 0.2
        },
        "magic": {
            intensity: 0.3,
            duration: 0.2
        },
        "wither": {
            intensity: 0.3,
            duration: 0.2
        },
        "anvil": {
            intensity: 0.3,
            duration: 0.2
        },
        "fallingBlock": {
            intensity: 0.3,
            duration: 0.2
        },
        "fall": {
            intensity: 0.05,
            duration: 0.03,
            scalar: true,
        }
    }
    function vibrateController(intensity, duration) {
        if (!gamepad) {
            return;
        }
        console.log(`[!] Vibrating controller for ${duration}s at ${intensity} intensity.`);
        gamepad.vibrationActuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: duration * 1000,
            weakMagnitude: intensity,
            strongMagnitude: intensity,
        });
    }
    function stopControllerVibration() {
        if (!gamepad) {
            return;
        }
        gamepad.vibrationActuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: 0,
            weakMagnitude: 0,
            strongMagnitude: 0,
        });
    }
    const oldDamagePlayer = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.entity.EntityPlayerSP", "damageEntity")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.entity.EntityPlayerSP", "damageEntity")] = function ($player, $source, $amount) {
        var player = ModAPI.util.wrap($player);
        if ($source && !player.isEntityInvulnerable($source)) {
            var key = ModAPI.util.ustr(ModAPI.util.wrap($source).damageType?.getRef());
            var conf = CONTROLLER_HAPTIC_FEEDBACK[key];
            if (key && conf) {
                if (conf.scalar) {
                    vibrateController(conf.intensity * $amount, conf.duration * $amount);
                } else {
                    vibrateController(conf.intensity, conf.duration);
                }
            }
        }
        oldDamagePlayer.apply(this, [$player, $source, $amount]);
    }

    const oldRespawnPlayer = ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.entity.EntityPlayerSP", "respawnPlayer")];
    ModAPI.hooks.methods[ModAPI.util.getMethodFromPackage("net.minecraft.client.entity.EntityPlayerSP", "respawnPlayer")] = function ($player,) {
        stopControllerVibration();
        oldRespawnPlayer.apply($player, []);
    }
})();