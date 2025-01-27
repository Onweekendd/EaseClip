module.exports = {
  endOfLine: "crlf",
  printWidth: 80,
  proseWrap: "preserve",
  plugins: [
    "@trivago/prettier-plugin-sort-imports",
    "prettier-plugin-tailwindcss",
  ],
  importOrder: [
    "^react$",
    "^next(.*)$",
    "<THIRD_PARTY_MODULES>",
    "^@video-editor/(.*)$",
    "^@/(.*)$",
    "^[./]",
  ],
  importOrderSeparation: true,
  importOrderSortSpecifiers: true,
};

