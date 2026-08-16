import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

// Common PINs people (and demo seeds) tend to use. Logged at startup so nobody
// accidentally goes live with one of these.
const WEAK_PINS = ["0000", "1111", "2222", "3333", "1234", "4321", "9999"];

export async function checkWeakPins() {
  try {
    const users = await prisma.user.findMany({ select: { username: true, pinHash: true } });
    let found = 0;
    for (const u of users) {
      for (const pin of WEAK_PINS) {
        if (await bcrypt.compare(pin, u.pinHash)) {
          console.warn(
            `SECURITY: user "${u.username}" still uses a weak/trivial PIN (${pin}). Change it in Settings > Users before going live.`,
          );
          found += 1;
          break;
        }
      }
    }
    if (found === 0 && users.length > 0) {
      console.log("Weak-PIN check: no users use a trivial PIN.");
    }
  } catch (err) {
    console.warn("Weak-PIN check skipped:", err instanceof Error ? err.message : err);
  }
}