/*
 * licenses.ts — GENERATED FILE, DO NOT EDIT BY HAND.
 *
 * Regenerate with:  node scripts/gen-licenses.mjs
 *
 * Third-party packages bundled into the shipped app, with the copyright
 * notices their licenses require us to reproduce. Dev-only tooling (Vite,
 * TypeScript, ESLint) is omitted — it never reaches the bundle — as are
 * type-only packages.
 *
 * Generated 2026-11-11 against package-lock.json.
 */

export type LicenseId = 'OFL-1.1' | 'Apache-2.0' | 'MIT'

export interface ThirdPartyPackage {
  /** npm package name. */
  name:      string
  /** Version resolved in package-lock.json at generation time. */
  version:   string
  license:   LicenseId
  /** Verbatim copyright line from the package's LICENSE file. */
  copyright: string
  url:       string
  /** true for packages listed in our own package.json dependencies. */
  direct:    boolean
  /**
   * The package's own statement of the terms of what it bundles, verbatim,
   * for packages that carry one in their code instead of a LICENSE file.
   */
  notice?:   string
}

export const THIRD_PARTY: ThirdPartyPackage[] = [
  {
    name: "@fontsource-variable/fraunces",
    version: "5.2.9",
    license: "OFL-1.1",
    copyright: "Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces)",
    url: "https://github.com/fontsource/font-files",
    direct: true
  },
  {
    name: "@fontsource-variable/inter",
    version: "5.2.8",
    license: "OFL-1.1",
    copyright: "Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter)",
    url: "https://github.com/fontsource/font-files",
    direct: true
  },
  {
    name: "@sqlite.org/sqlite-wasm",
    version: "3.54.1-build1",
    license: "Apache-2.0",
    copyright: "Copyright (c) Thomas Steiner (tomac@google.com)",
    url: "https://github.com/sqlite/sqlite-wasm",
    direct: true,
    notice: "LICENSE for the sqlite3 WebAssembly/JavaScript APIs.\n\nThis bundle (typically released as sqlite3.js or sqlite3.mjs) is an amalgamation of JavaScript source code from two projects:\n\n1) https://emscripten.org: the Emscripten \"glue code\" is covered by the terms of the MIT license and University of Illinois/NCSA Open Source License, as described at:\n\nhttps://emscripten.org/docs/introducing_emscripten/emscripten_license.html\n\n2) https://sqlite.org: all code and documentation labeled as being from this source are released under the same terms as the sqlite3 C library:\n\n2022-10-16\n\nThe author disclaims copyright to this source code.  In place of a legal notice, here is a blessing:\n\n*   May you do good and not evil.\n*   May you find forgiveness for yourself and forgive others.\n*   May you share freely, never taking more than you give."
  },
  {
    name: "marked",
    version: "18.0.2",
    license: "MIT",
    copyright: "Copyright (c) 2018+, MarkedJS (https://github.com/markedjs/)\nCopyright (c) 2011-2018, Christopher Jeffrey (https://github.com/chjj/)\nCopyright © 2004, John Gruber",
    url: "https://github.com/markedjs/marked",
    direct: true
  },
  {
    name: "nanoid",
    version: "5.1.16",
    license: "MIT",
    copyright: "Copyright 2017 Andrey Sitnik <andrey@sitnik.es>",
    url: "https://github.com/ai/nanoid",
    direct: true
  },
  {
    name: "react",
    version: "19.2.5",
    license: "MIT",
    copyright: "Copyright (c) Meta Platforms, Inc. and affiliates.",
    url: "https://github.com/facebook/react",
    direct: true
  },
  {
    name: "react-dom",
    version: "19.2.5",
    license: "MIT",
    copyright: "Copyright (c) Meta Platforms, Inc. and affiliates.",
    url: "https://github.com/facebook/react",
    direct: true
  },
  {
    name: "react-moveable",
    version: "0.56.0",
    license: "MIT",
    copyright: "Copyright (c) 2019 Daybrush",
    url: "https://github.com/daybrush/moveable/blob/master/packages/react-moveable",
    direct: true
  },
  {
    name: "react-selecto",
    version: "1.26.3",
    license: "MIT",
    copyright: "Copyright (c) 2020 Daybrush",
    url: "https://github.com/daybrush/selecto/blob/master/packages/react-selecto",
    direct: true
  },
  {
    name: "zustand",
    version: "5.0.12",
    license: "MIT",
    copyright: "Copyright (c) 2019 Paul Henschel",
    url: "https://github.com/pmndrs/zustand",
    direct: true
  },
  {
    name: "@cfcs/core",
    version: "0.0.6",
    license: "MIT",
    copyright: "Copyright (c) NAVER Crop.",
    url: "https://github.com/naver/cfcs",
    direct: false
  },
  {
    name: "@daybrush/utils",
    version: "1.13.0",
    license: "MIT",
    copyright: "Copyright (c) 2018 Daybrush",
    url: "https://github.com/daybrush/utils",
    direct: false
  },
  {
    name: "@egjs/agent",
    version: "2.4.4",
    license: "MIT",
    copyright: "Copyright (c) 2015 NAVER Corp.",
    url: "https://github.com/naver/egjs-agent",
    direct: false
  },
  {
    name: "@egjs/children-differ",
    version: "1.0.1",
    license: "MIT",
    copyright: "Copyright (c) 2019-present NAVER Corp.",
    url: "https://github.com/naver/egjs-children-differ",
    direct: false
  },
  {
    name: "@egjs/component",
    version: "3.0.5",
    license: "MIT",
    copyright: "Copyright (c) NAVER Corp.",
    url: "https://github.com/naver/egjs-component",
    direct: false
  },
  {
    name: "@egjs/list-differ",
    version: "1.0.1",
    license: "MIT",
    copyright: "Copyright (c) 2019-present NAVER Corp.",
    url: "https://github.com/naver/egjs-list-differ",
    direct: false
  },
  {
    name: "@scena/dragscroll",
    version: "1.4.0",
    license: "MIT",
    copyright: "Copyright (c) 2019 Daybrush",
    url: "https://github.com/daybrush/dragscroll",
    direct: false
  },
  {
    name: "@scena/event-emitter",
    version: "1.0.5",
    license: "MIT",
    copyright: "Copyright (c) 2019 Daybrush",
    url: "https://github.com/daybrush/gesture",
    direct: false
  },
  {
    name: "@scena/matrix",
    version: "1.1.1",
    license: "MIT",
    copyright: "Copyright (c) 2020 Daybrush",
    url: "https://github.com/daybrush/matrix",
    direct: false
  },
  {
    name: "css-styled",
    version: "1.0.8",
    license: "MIT",
    copyright: "Copyright (c) Daybrush",
    url: "https://github.com/daybrush/css-styled",
    direct: false
  },
  {
    name: "css-to-mat",
    version: "1.1.1",
    license: "MIT",
    copyright: "Copyright (c) 2019 Daybrush",
    url: "https://github.com/daybrush/css-to-mat",
    direct: false
  },
  {
    name: "framework-utils",
    version: "1.1.0",
    license: "MIT",
    copyright: "Copyright (c) 2019 Daybrush",
    url: "https://github.com/daybrush/framework-utils",
    direct: false
  },
  {
    name: "gesto",
    version: "1.19.4",
    license: "MIT",
    copyright: "Copyright (c) 2019 Daybrush",
    url: "https://github.com/daybrush/gesto",
    direct: false
  },
  {
    name: "keycode",
    version: "2.2.1",
    license: "MIT",
    copyright: "Copyright (c) 2014 Tim Oxley",
    url: "https://github.com/timoxley/keycode",
    direct: false
  },
  {
    name: "keycon",
    version: "1.4.0",
    license: "MIT",
    copyright: "Copyright (c) Daybrush",
    url: "https://github.com/daybrush/keycon",
    direct: false
  },
  {
    name: "overlap-area",
    version: "1.1.0",
    license: "MIT",
    copyright: "Copyright (c) 2020 Daybrush",
    url: "https://github.com/daybrush/overlap-area",
    direct: false
  },
  {
    name: "react-css-styled",
    version: "1.1.9",
    license: "MIT",
    copyright: "Copyright (c) 2019 Daybrush",
    url: "https://github.com/daybrush/css-styled/tree/master/packages/react-css-styled",
    direct: false
  },
  {
    name: "scheduler",
    version: "0.27.0",
    license: "MIT",
    copyright: "Copyright (c) Meta Platforms, Inc. and affiliates.",
    url: "https://github.com/facebook/react",
    direct: false
  },
  {
    name: "selecto",
    version: "1.26.3",
    license: "MIT",
    copyright: "Copyright (c) 2020 Daybrush",
    url: "https://github.com/daybrush/selecto",
    direct: false
  }
]

/**
 * License bodies, stored once and paired with each package's own copyright
 * line at render time. Each of these licenses requires the notice and the
 * license text to travel with the distributed work.
 */
export const LICENSE_TEXTS: Record<LicenseId, string> = {
  'MIT': "Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.",
  'OFL-1.1': "-----------------------------------------------------------\nSIL OPEN FONT LICENSE Version 1.1 - 26 February 2007\n-----------------------------------------------------------\n\nPREAMBLE\nThe goals of the Open Font License (OFL) are to stimulate worldwide\ndevelopment of collaborative font projects, to support the font creation\nefforts of academic and linguistic communities, and to provide a free and\nopen framework in which fonts may be shared and improved in partnership\nwith others.\n\nThe OFL allows the licensed fonts to be used, studied, modified and\nredistributed freely as long as they are not sold by themselves. The\nfonts, including any derivative works, can be bundled, embedded,\nredistributed and/or sold with any software provided that any reserved\nnames are not used by derivative works. The fonts and derivatives,\nhowever, cannot be released under any other type of license. The\nrequirement for fonts to remain under this license does not apply\nto any document created using the fonts or their derivatives.\n\nDEFINITIONS\n\"Font Software\" refers to the set of files released by the Copyright\nHolder(s) under this license and clearly marked as such. This may\ninclude source files, build scripts and documentation.\n\n\"Reserved Font Name\" refers to any names specified as such after the\ncopyright statement(s).\n\n\"Original Version\" refers to the collection of Font Software components as\ndistributed by the Copyright Holder(s).\n\n\"Modified Version\" refers to any derivative made by adding to, deleting,\nor substituting -- in part or in whole -- any of the components of the\nOriginal Version, by changing formats or by porting the Font Software to a\nnew environment.\n\n\"Author\" refers to any designer, engineer, programmer, technical\nwriter or other person who contributed to the Font Software.\n\nPERMISSION & CONDITIONS\nPermission is hereby granted, free of charge, to any person obtaining\na copy of the Font Software, to use, study, copy, merge, embed, modify,\nredistribute, and sell modified and unmodified copies of the Font\nSoftware, subject to the following conditions:\n\n1) Neither the Font Software nor any of its individual components,\nin Original or Modified Versions, may be sold by itself.\n\n2) Original or Modified Versions of the Font Software may be bundled,\nredistributed and/or sold with any software, provided that each copy\ncontains the above copyright notice and this license. These can be\nincluded either as stand-alone text files, human-readable headers or\nin the appropriate machine-readable metadata fields within text or\nbinary files as long as those fields can be easily viewed by the user.\n\n3) No Modified Version of the Font Software may use the Reserved Font\nName(s) unless explicit written permission is granted by the corresponding\nCopyright Holder. This restriction only applies to the primary font name as\npresented to the users.\n\n4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font\nSoftware shall not be used to promote, endorse or advertise any\nModified Version, except to acknowledge the contribution(s) of the\nCopyright Holder(s) and the Author(s) or with their explicit written\npermission.\n\n5) The Font Software, modified or unmodified, in part or in whole,\nmust be distributed entirely under this license, and must not be\ndistributed under any other license. The requirement for fonts to\nremain under this license does not apply to any document created\nusing the Font Software.\n\nTERMINATION\nThis license becomes null and void if any of the above conditions are\nnot met.\n\nDISCLAIMER\nTHE FONT SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND,\nEXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF\nMERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT\nOF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE\nCOPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,\nINCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL\nDAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING\nFROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM\nOTHER DEALINGS IN THE FONT SOFTWARE.",
  'Apache-2.0': "Apache License\n\nVersion 2.0, January 2004\n\nhttp://www.apache.org/licenses/\n\nTERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION\n\n1. Definitions.\n\n\"License\" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document.\n\n\"Licensor\" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License.\n\n\"Legal Entity\" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity. For the purposes of this definition, \"control\" means (i) the power, direct or indirect, to cause the direction or management of such entity, whether by contract or otherwise, or (ii) ownership of fifty percent (50%) or more of the outstanding shares, or (iii) beneficial ownership of such entity.\n\n\"You\" (or \"Your\") shall mean an individual or Legal Entity exercising permissions granted by this License.\n\n\"Source\" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files.\n\n\"Object\" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types.\n\n\"Work\" shall mean the work of authorship, whether in Source or Object form, made available under the License, as indicated by a copyright notice that is included in or attached to the work (an example is provided in the Appendix below).\n\n\"Derivative Works\" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work and for which the editorial revisions, annotations, elaborations, or other modifications represent, as a whole, an original work of authorship. For the purposes of this License, Derivative Works shall not include works that remain separable from, or merely link (or bind by name) to the interfaces of, the Work and Derivative Works thereof.\n\n\"Contribution\" shall mean any work of authorship, including the original version of the Work and any modifications or additions to that Work or Derivative Works thereof, that is intentionally submitted to Licensor for inclusion in the Work by the copyright owner or by an individual or Legal Entity authorized to submit on behalf of the copyright owner. For the purposes of this definition, \"submitted\" means any form of electronic, verbal, or written communication sent to the Licensor or its representatives, including but not limited to communication on electronic mailing lists, source code control systems, and issue tracking systems that are managed by, or on behalf of, the Licensor for the purpose of discussing and improving the Work, but excluding communication that is conspicuously marked or otherwise designated in writing by the copyright owner as \"Not a Contribution.\"\n\n\"Contributor\" shall mean Licensor and any individual or Legal Entity on behalf of whom a Contribution has been received by Licensor and subsequently incorporated within the Work.\n\n2. Grant of Copyright License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.\n\n3. Grant of Patent License. Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted. If You institute patent litigation against any entity (including a cross-claim or counterclaim in a lawsuit) alleging that the Work or a Contribution incorporated within the Work constitutes direct or contributory patent infringement, then any patent licenses granted to You under this License for that Work shall terminate as of the date such litigation is filed.\n\n4. Redistribution. You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions:\n\nYou must give any other recipients of the Work or Derivative Works a copy of this License; and\n\nYou must cause any modified files to carry prominent notices stating that You changed the files; and\n\nYou must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work, excluding those notices that do not pertain to any part of the Derivative Works; and\n\nIf the Work includes a \"NOTICE\" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file, excluding those notices that do not pertain to any part of the Derivative Works, in at least one of the following places: within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation, if provided along with the Derivative Works; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear. The contents of the NOTICE file are for informational purposes only and do not modify the License. You may add Your own attribution notices within Derivative Works that You distribute, alongside or as an addendum to the NOTICE text from the Work, provided that such additional attribution notices cannot be construed as modifying the License. You may add Your own copyright statement to Your modifications and may provide additional or different license terms and conditions for use, reproduction, or distribution of Your modifications, or for any such Derivative Works as a whole, provided Your use, reproduction, and distribution of the Work otherwise complies with the conditions stated in this License.\n\n5. Submission of Contributions. Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions. Notwithstanding the above, nothing herein shall supersede or modify the terms of any separate license agreement you may have executed with Licensor regarding such Contributions.\n\n6. Trademarks. This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the NOTICE file.\n\n7. Disclaimer of Warranty. Unless required by applicable law or agreed to in writing, Licensor provides the Work (and each Contributor provides its Contributions) on an \"AS IS\" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely responsible for determining the appropriateness of using or redistributing the Work and assume any risks associated with Your exercise of permissions under this License.\n\n8. Limitation of Liability. In no event and under no legal theory, whether in tort (including negligence), contract, or otherwise, unless required by applicable law (such as deliberate and grossly negligent acts) or agreed to in writing, shall any Contributor be liable to You for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the Work (including but not limited to damages for loss of goodwill, work stoppage, computer failure or malfunction, or any and all other commercial damages or losses), even if such Contributor has been advised of the possibility of such damages.\n\n9. Accepting Warranty or Additional Liability. While redistributing the Work or Derivative Works thereof, You may choose to offer, and charge a fee for, acceptance of support, warranty, indemnity, or other liability obligations and/or rights consistent with this License. However, in accepting such obligations, You may act only on Your own behalf and on Your sole responsibility, not on behalf of any other Contributor, and only if You agree to indemnify, defend, and hold each Contributor harmless for any liability incurred by, or claims asserted against, such Contributor by reason of your accepting any such warranty or additional liability.\n\nEND OF TERMS AND CONDITIONS",
}

export const LICENSE_NAMES: Record<LicenseId, string> = {
  'MIT': 'MIT License',
  'OFL-1.1': 'SIL Open Font License 1.1',
  'Apache-2.0': 'Apache License 2.0',
}
