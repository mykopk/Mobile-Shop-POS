// Best-effort ESC/POS direct thermal printing via WebUSB (Chromium / Electron).
// Requires a USB receipt printer. Pure browser print (window.print) remains the
// primary path; this is an optional direct path for compatible ESC/POS printers.

interface WebUsbEndpoint {
  endpointNumber: number;
  direction: "in" | "out";
}
interface WebUsbInterface {
  interfaceNumber: number;
  alternate: { endpoints: WebUsbEndpoint[] };
}
interface WebUsbDevice {
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(config: number): Promise<void>;
  claimInterface(n: number): Promise<void>;
  transferOut(endpoint: number, data: Uint8Array): Promise<unknown>;
  configuration: { interfaces: WebUsbInterface[] };
}
interface WebUsb {
  requestDevice(options: { filters: unknown[] }): Promise<WebUsbDevice>;
}

declare global {
  interface Navigator {
    usb?: WebUsb;
  }
}

export function thermalPrintSupported() {
  return typeof navigator !== "undefined" && !!navigator.usb;
}

function encodeText(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

export async function printThermalText(lines: string[]): Promise<void> {
  if (!navigator.usb) throw new Error("WebUSB is not supported in this browser");
  const device = await navigator.usb.requestDevice({ filters: [] });
  await device.open();
  try {
    await device.selectConfiguration(1);
    const iface = device.configuration.interfaces[0];
    const endpoint = iface.alternate.endpoints.find((ep) => ep.direction === "out");
    if (!endpoint) throw new Error("No output endpoint on the printer");
    await device.claimInterface(iface.interfaceNumber);

    const bytes: number[] = [];
    bytes.push(0x1b, 0x40); // ESC @ reset
    bytes.push(0x1b, 0x61, 0x01); // ESC a 1 center
    for (const line of lines) {
      for (const b of encodeText(line)) bytes.push(b);
      bytes.push(0x0a); // LF
    }
    bytes.push(0x1d, 0x56, 0x41, 0x00); // GS V A cut
    bytes.push(0x0a, 0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x01); // feed + cut

    await device.transferOut(endpoint.endpointNumber, new Uint8Array(bytes));
  } finally {
    device.close();
  }
}
