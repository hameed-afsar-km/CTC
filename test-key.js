function unwrap(value) {
  if (!value) return undefined;
  let v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function getPrivateKey(envValue) {
  const value = unwrap(envValue);
  if (!value) return undefined;
  return value.replace(/\\n/g, "\n");
}

const key1 = `"-----BEGIN PRIVATE KEY-----\\nMII...\\n-----END PRIVATE KEY-----\\n"`;
const key2 = `-----BEGIN PRIVATE KEY-----\\nMII...\\n-----END PRIVATE KEY-----\\n`;
const key3 = `-----BEGIN PRIVATE KEY-----
MII...
-----END PRIVATE KEY-----
`;

console.log("key1:", getPrivateKey(key1) === `-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n` ? "PASS" : "FAIL");
console.log("key2:", getPrivateKey(key2) === `-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n` ? "PASS" : "FAIL");
console.log("key3:", getPrivateKey(key3) === `-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n` ? "PASS" : "FAIL");

