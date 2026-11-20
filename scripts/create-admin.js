const fs = require("node:fs");
const path = require("node:path");
const { randomBytes, randomUUID, scryptSync } = require("node:crypto");

const email = String(process.argv[2] || "").trim().toLowerCase();
const name = String(process.argv[3] || "Hospital Administrator").trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
  console.error("Usage: node scripts/create-admin.js <email> [display name] (password is read from stdin)");
  process.exit(1);
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const password = input.replace(/\r?\n$/, "");
  if (password.length < 12 || password.length > 1024) {
    console.error("Password must be between 12 and 1024 characters.");
    process.exitCode = 1;
    return;
  }

  const dataFile = path.join(__dirname, "..", "data.json");
  let data;
  try {
    data = JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (error) {
    console.error(`Could not read hospital data: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  data.users = Array.isArray(data.users) ? data.users : [];
  if (data.users.some((user) => user.email === email)) {
    console.error("An administrator with that email already exists.");
    process.exitCode = 1;
    return;
  }

  const salt = randomBytes(16);
  const passwordHash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  data.users.push({
    id: `u-${randomUUID()}`,
    name,
    email,
    role: "admin",
    salt: salt.toString("hex"),
    passwordHash: passwordHash.toString("hex")
  });
  try {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), { mode: 0o600 });
    console.log(`Administrator ${email} created. The password was stored as a salted scrypt hash.`);
  } catch (error) {
    console.error(`Could not save administrator: ${error.message}`);
    process.exitCode = 1;
  }
});
