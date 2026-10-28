/**
 * Provision Admin User Script
 *
 * Usage:
 *   node scripts/provision_admin.js [--username <user>] [--password <pass>] [--remote]
 *
 * Examples:
 *   node scripts/provision_admin.js --username admin --password MySecurePass123
 *   node scripts/provision_admin.js --remote
 */

const crypto = require("node:crypto");
const readline = require("node:readline");
const { execSync } = require("node:child_process");

function hashPassword(password, saltHex) {
  const salt = Buffer.from(saltHex, "hex");
  const derived = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  return derived.toString("hex");
}

function askQuestion(query, hidden = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(query);
      let input = "";
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      const onData = (char) => {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input);
        } else if (char === "\u0003") {
          process.exit(1);
        } else if (char === "\b" || char === "\x7f") {
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else {
          input += char;
          process.stdout.write("*");
        }
      };

      process.stdin.on("data", onData);
    } else {
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
      });
    }
  });
}

async function main() {
  const args = process.argv.slice(2);
  let username = "";
  let password = "";
  let isRemote = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--username" && args[i + 1]) {
      username = args[++i].trim();
    } else if (args[i] === "--password" && args[i + 1]) {
      password = args[++i];
    } else if (args[i] === "--remote") {
      isRemote = true;
    }
  }

  if (!username) {
    username = (await askQuestion("Nhap ten dang nhap admin (mac dinh: admin): ")).trim() || "admin";
  }

  if (!password) {
    password = await askQuestion("Nhap mat khau admin (toi thieu 8 ky tu): ", true);
  }

  if (password.length < 8) {
    console.error("Loi: Mat khau phai co toi thieu 8 ky tu.");
    process.exit(1);
  }

  const saltHex = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, saltHex);
  const nowIso = new Date().toISOString();

  // Escape single quotes for SQL string literal
  const escapedUser = username.replace(/'/g, "''");
  const sql = `INSERT INTO admin_users (username, password_hash, salt, created_at) VALUES ('${escapedUser}', '${passwordHash}', '${saltHex}', '${nowIso}') ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash, salt=excluded.salt, created_at=excluded.created_at;`;

  console.log(`\nDang khoi tao tai khoan admin '${username}' vao database (${isRemote ? "REMOTE" : "LOCAL"})...`);

  const targetFlag = isRemote ? "--remote" : "--local";
  // Run wrangler via local execution
  try {
    const cmd = `npx wrangler d1 execute thiepcuoi_d1 ${targetFlag} --command="${sql.replace(/"/g, '\\"')}"`;
    execSync(cmd, { stdio: "inherit" });
    console.log(`\n[THANH CONG] Tai khoan admin '${username}' da duoc tao/cap nhat thanh cong!`);
  } catch (err) {
    console.error("\n[LOI] Khong the thuc thi lenh tao tai khoan:", err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Loi:", err);
  process.exit(1);
});
