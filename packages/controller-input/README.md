# @ctrlr/controller-input

Cross-platform USB game controller detection and event normalization, built on [`node-hid`](https://github.com/node-hid/node-hid).

## Usage

```ts
import { ControllerManager } from '@ctrlr/controller-input';

const mgr = new ControllerManager();

mgr.on('connect', (info) => console.log('connected', info.product));
mgr.on('disconnect', (info) => console.log('lost', info.product));
mgr.on('input', (event) => {
  if (event.type === 'button' && event.pressed) {
    console.log('press', event.button);
  }
});

await mgr.start();
```

## Supported devices

The package ships with **dedicated parsers** for:

- Xbox One / Series X|S controllers (USB and Bluetooth, on Linux/macOS)
- DualShock 4 (PS4) and DualSense (PS5)

Anything else that advertises HID usage page `0x01` usage `0x04`/`0x05` falls through to a **generic gamepad parser**. It won't always get the labels right, but you'll see events and can map them via `ctrlr.bindings.json`.

## Platform notes

| OS      | Xbox via USB | Xbox via BT | PlayStation | Generic HID |
| ------- | ------------ | ----------- | ----------- | ----------- |
| Linux   | yes (xpad)   | yes         | yes         | yes         |
| macOS   | yes          | yes         | yes         | yes         |
| Windows | **no\***     | yes         | yes         | yes         |

\* On Windows, Xbox controllers attached over USB expose **XInput**, not HID, so `node-hid` cannot see them. Two workarounds: pair the controller over Bluetooth instead, or run inside WSL with `usbipd` forwarding.

## API

### `class ControllerManager`

| Member               | Description                                                                       |
| -------------------- | --------------------------------------------------------------------------------- |
| `start()`            | Begin scanning and emitting events. Loads `node-hid` lazily.                      |
| `stop()`             | Close all opened devices and stop polling.                                        |
| `list()`             | Currently-open controllers as `ControllerInfo[]`.                                 |
| `scanOnce()`         | Force a single discovery pass synchronously (used by `ctrlr controllers`).        |
| `on('input', cb)`    | Normalized button / stick / trigger events.                                       |
| `on('connect', cb)`  | A new gamepad came online.                                                        |
| `on('disconnect',cb)`| A gamepad went away.                                                              |
| `on('error', cb)`    | Errors from `node-hid` (permission denied, device busy, …).                       |

### Normalized events

Every event has `{ ts, controllerId }`.

```ts
{ type: 'button',  button: 'A', pressed: true }
{ type: 'stick',   stick: 'left', x: 0.83, y: -0.12 }
{ type: 'trigger', trigger: 'RT', value: 0.74 }
```

`x` is right-positive, `y` is down-positive (matches HTML5 Gamepad API).
