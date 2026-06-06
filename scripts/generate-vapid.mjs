// Generates a VAPID keypair for Web Push and prints env-ready lines.
// Usage: npm run gen:vapid
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\nVAPID keypair generated. Add to .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:you@example.com\n`);
