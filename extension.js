// SPDX-License-Identifier: GPL-2.0-or-later
'use strict';

import Clutter from 'gi://Clutter';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gst from 'gi://Gst';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';

// ✅ SOUND_SETS — labels and emojis preserved
const SOUND_SETS = {
    click1:  { label: 'Osu',            icon: '🌸' },
    click2:  { label: 'Hitokage',       icon: '🔥' },
    click3:  { label: 'Semimecha',      icon: '⚙️'  },
    click4:  { label: 'Lubed',          icon: '🧈' },
    click5:  { label: 'Nk cream',       icon: '🎵' },
    click6:  { label: 'Topre',          icon: '💎' },
    click7:  { label: 'Mx Black',       icon: '🖤' },
    click14: { label: 'Stealth',        icon: '🌙' },
    click15: { label: 'Box Pink',       icon: '🌸' },
    click16: { label: 'Gateron Yellow', icon: '💛' },
};

// ✅ WAV file list
const SOUND_FILE_MAP = {
    click1:  ['click1/click1_1.wav',   'click1/click1_2.wav',   'click1/click1_3.wav'],
    click2:  ['click2/click2_1.wav',   'click2/click2_2.wav',   'click2/click2_3.wav'],
    click3:  ['click3/click3_1.wav',   'click3/click3_2.wav',   'click3/click3_3.wav'],
    click4:  ['click4/click4_1.wav',   'click4/click4_2.wav',   'click4/click4_3.wav'],
    click5:  ['click5/click5_1.wav',   'click5/click5_2.wav',   'click5/click5_3.wav'],
    click6:  ['click6/click6_1.wav',   'click6/click6_2.wav',   'click6/click6_3.wav'],
    click7:  ['click7/click7_1.wav',   'click7/click7_2.wav',   'click7/click7_3.wav'],
    click14: ['click14/click14_1.wav', 'click14/click14_2.wav', 'click14/click14_3.wav'],
    click15: ['click15/click15_1.wav', 'click15/click15_2.wav', 'click15/click15_3.wav'],
    click16: ['click16/click16_1.wav', 'click16/click16_2.wav', 'click16/click16_3.wav'],
};

// ---------------------------------------------------------------------------
// Sound style menu item
// ---------------------------------------------------------------------------
const SoundStyleItem = GObject.registerClass(
class SoundStyleItem extends PopupMenu.PopupMenuItem {
    _init(styleKey, styleInfo, settings, playSoundFn) {
        super._init(`${styleInfo.icon}  ${styleInfo.label}`);
        this._styleKey = styleKey;
        this._settings = settings;

        this.connect('activate', () => {
            this._settings.set_string('sound-style', this._styleKey);
            const paths = SOUND_FILE_MAP[this._styleKey];
            playSoundFn(paths[Math.floor(Math.random() * paths.length)]);
        });
    }

    syncOrnament() {
        this.setOrnament(
            this._settings.get_string('sound-style') === this._styleKey
                ? PopupMenu.Ornament.DOT
                : PopupMenu.Ornament.NONE
        );
    }
});

// ---------------------------------------------------------------------------
// Volume row — PopupMenuItem with − label + buttons
// ---------------------------------------------------------------------------
const VolumeItem = GObject.registerClass(
class VolumeItem extends PopupMenu.PopupBaseMenuItem {
    _init(settings) {
        super._init({ activate: false });
        this._settings = settings;

        const icon = new St.Icon({
            icon_name: 'audio-volume-high-symbolic',
            style_class: 'popup-menu-icon',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(icon);

        this._label = new St.Label({
            text: this._volText(),
            x_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
            x_align: Clutter.ActorAlign.CENTER,
        });
        this.add_child(this._label);

        const btnDown = new St.Button({
            label: '−',
            style_class: 'button',
            y_align: Clutter.ActorAlign.CENTER,
        });
        btnDown.connect('clicked', () => this._adjust(-0.1));
        this.add_child(btnDown);

        const btnUp = new St.Button({
            label: '+',
            style_class: 'button',
            y_align: Clutter.ActorAlign.CENTER,
        });
        btnUp.connect('clicked', () => this._adjust(0.1));
        this.add_child(btnUp);
    }

    _adjust(delta) {
        const v = Math.min(1.0, Math.max(0.0,
            this._settings.get_double('volume') + delta));
        this._settings.set_double('volume', v);
        this._label.text = this._volText();
    }

    _volText() {
        return `Vol: ${Math.round(this._settings.get_double('volume') * 100)}%`;
    }
});

// ---------------------------------------------------------------------------
// Main Quick Settings toggle
// ---------------------------------------------------------------------------
const KeySoundToggle = GObject.registerClass(
class KeySoundToggle extends QuickSettings.QuickMenuToggle {
    _init(settings, playSoundFn) {
        super._init({
            title: 'Key Sound',
            iconName: 'audio-volume-high-symbolic',
            toggleMode: true,
        });

        this._settings = settings;
        this._styleItems = [];

        this._settings.bind('enabled', this, 'checked', Gio.SettingsBindFlags.DEFAULT);
        this.connect('clicked', () => {
            this._settings.set_boolean('enabled', this.checked);
        });

        this.menu.setHeader('audio-volume-high-symbolic', 'Key Sound');

        // Volume row
        this.menu.addMenuItem(new VolumeItem(this._settings));
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem('Sound Style'));

        // Style items
        for (const [key, info] of Object.entries(SOUND_SETS)) {
            const item = new SoundStyleItem(key, info, this._settings, playSoundFn);
            item.syncOrnament();
            this._styleItems.push(item);
            this.menu.addMenuItem(item);
        }

        this._styleChangedId = this._settings.connect('changed::sound-style', () => {
            this._styleItems.forEach(i => i.syncOrnament());
        });
    }

    destroy() {
        if (this._styleChangedId) {
            this._settings.disconnect(this._styleChangedId);
            this._styleChangedId = null;
        }
        super.destroy();
    }
});

// ---------------------------------------------------------------------------
// Extension entry point
// ---------------------------------------------------------------------------
export default class KeySoundExtension extends Extension {
    enable() {
        this._settings = this.getSettings('org.gnome.shell.extensions.keysound');

        // ✅ GStreamer (replaces AudioContext)
        Gst.init(null);
        this._playbin = Gst.ElementFactory.make('playbin', 'playbin');

        // ✅ GNOME 45+ keyboard hook (replaces key-press-event on MetaDisplay)
        this._keyHandlerId = global.stage.connect(
            'captured-event',
            this._onKeyPress.bind(this)
        );

        this._toggle = new KeySoundToggle(this._settings, this._playSound.bind(this));
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._toggle);
    }

    disable() {
        if (this._keyHandlerId) {
            global.stage.disconnect(this._keyHandlerId);
            this._keyHandlerId = 0;
        }
        if (this._playbin) {
            this._playbin.set_state(Gst.State.NULL);
            this._playbin = null;
        }
        if (this._toggle) {
            Main.panel.statusArea.quickSettings.removeExternalIndicator(this._toggle);
            this._toggle.destroy();
            this._toggle = null;
        }
        this._settings = null;
    }

    _onKeyPress(_actor, event) {
        // Filter to key presses only — captured-event fires for all input
        if (event.type() !== Clutter.EventType.KEY_PRESS)
            return Clutter.EVENT_PROPAGATE;
        if (!this._settings.get_boolean('enabled'))
            return Clutter.EVENT_PROPAGATE;

        const soundStyle = this._settings.get_string('sound-style');
        const paths = SOUND_FILE_MAP[soundStyle];
        if (!paths) return Clutter.EVENT_PROPAGATE;

        // ✅ Randomization kept
        const path = paths[Math.floor(Math.random() * paths.length)];
        this._playSound(path);
        return Clutter.EVENT_PROPAGATE;
    }

    _playSound(filename) {
        if (!this._playbin) return;
        const filePath = GLib.build_filenamev([this.path, 'sound', filename]);
        this._playbin.set_state(Gst.State.READY);
        this._playbin.set_property('uri', `file://${filePath}`);
        // ✅ Volume scaling 0.0–1.0
        this._playbin.set_property('volume', this._settings.get_double('volume'));
        this._playbin.set_state(Gst.State.PLAYING);
    }
}
