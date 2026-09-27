/* android-details.js
   What each Android app page says beyond its catalogue entry. Every line is
   taken from the app's own Play listing kit, its gating code or its manifest,
   and the ads wording matches the Android privacy policies word for word.
   Mobile TuneX follows its listing rules: say the mechanism, never the
   outcome, and none of the words Play rejected it for. */

const ADS = 'The free version shows ads served by Google AdMob. Google may use your device’s Advertising ID under its own policies. Hasnain Studio X does not receive or store it. Buying Pro removes all ads.';

module.exports.ADS = ADS;

module.exports.DETAILS = {
  mobiletunex: {
    label: 'Storage and device tools',
    minAndroid: '7.0',
    who: 'anyone whose phone keeps running out of space, and anyone who wants to see what is on their phone before deleting any of it',
    subject: { short: 'your photos and files', long: 'the photos, videos and files on your phone' },
    groups: [
      ['See where your space went', 'Your storage is broken down into videos, photos, audio and everything else, with the real size of each. Tap a category and you are straight into the tool that deals with it. Every number is read from your own phone.'],
      ['Clear what you choose', 'The cleaner rounds up app cache, temporary files and leftover junk, sorted by category, and nothing goes until you tick it. Gallery Scan finds duplicate and blurry photos and shows each one before it is deleted. Large Files lists your biggest photos and videos with thumbnails, Chat Media finds the WhatsApp photos, videos and voice notes piling up in the background, and Apps Scan lists your apps by size and by when you last opened them.'],
      ['Keep the photo, lose the size', 'Compress Media makes smaller copies of the photos and videos you pick and shows the exact space saved. Your originals stay until you decide to remove them.'],
      ['Know your phone', 'Battery shows charge level, temperature, charge rate and power source. Thermal Monitor shows live battery and CPU temperature and the heat status Android reports. Speed Test measures ping, jitter, download and upload, with a live graph and a saved history. System Info gathers hardware, memory, storage, display and Android details in one view.'],
      ['Games, and the rest', 'Game Mode turns on Do Not Disturb for a session you set and can open your game for you. Pre-Game Check clears the files you select and shows memory and temperature before you play. There is also a home screen widget, a biometric App Lock, maintenance reminders, per-app notification controls and PDF reports you can save or share.'],
    ],
    honest: 'Mobile TuneX measures, compresses and deletes what you choose. It does not pretend to speed up your phone, cool its processor or extend battery life, because Android does not let any app do that.',
    free: 'The storage breakdown, the cleaner, Gallery Scan, Large Files, Chat Media, Apps Scan, Battery, Speed Test and System Info, with ads.',
    pro: ['No ads', 'Deep Clean', 'Apps Deep Scan and Gallery Deep Scan', 'Compress Media', 'Thermal Monitor',
      'Game Mode and Pre-Game Check', 'Automatic maintenance', 'Bulk delete', 'PDF reports'],
    proNote: 'On the free version you can open any Pro tool for 10 minutes by watching an ad. Pro restores on every device signed in to the same Google account.',
    asks: [
      ['Photos, videos and storage', 'to scan, clean and compress the files you choose'],
      ['Usage access', 'to show when you last opened each app'],
      ['Uninstall requests', 'Android asks you to confirm every app removal'],
      ['Notifications', 'for the maintenance reminders you set'],
      ['Biometrics', 'for App Lock, if you turn it on'],
      ['Network', 'for the speed test, the ads and the Pro purchase check'],
      ['Advertising ID', 'for the AdMob ads in the free version'],
    ],
    net: 'Scanning, cleaning and compressing work offline. The speed test needs a connection, and so do the ads in the free version and the Pro purchase check.',
    netShort: 'Offline, except the speed test',
  },

  spatiaxmobile: {
    minAndroid: '9',
    who: 'music listeners, gamers, film watchers and commuters who care how their phone sounds',
    subject: { short: 'your audio', long: 'the sound your phone plays' },
    groups: [
      ['A sound mode for the moment', 'Hyper3D opens the stage beyond your ears with Hyper Wide, Hyper Front and Hyper Hall. UltraBass adds sub-bass with Deep Sub and Punch. Crystal brings voices and detail forward with Vocal Focus and Air Lift. One tap starts the engine for the music, films, games and calls you play.'],
      ['Tuned to your ears', 'A 10-band equaliser with clip-safe limiting, profiles tuned for popular headphones and earbuds, and a memory for every output: your earbuds, your speaker and your car each keep their own sound.'],
      ['Hear the difference', 'Night mode softens loud peaks for late listening, live meters show the sound as it plays, and holding the compare button switches the enhancement off so you can hear exactly what it adds.'],
    ],
    free: 'The full engine with ads, for 30 minutes a day, which rewarded ads can extend to 60 minutes.',
    pro: ['No ads', 'No daily time limit', 'The equaliser and presets, permanently'],
    proNote: 'Pro features can be tried free for a short time before you buy.',
    asks: [
      ['Audio settings', 'to apply the enhancement to what your phone plays'],
      ['Foreground service and notification', 'keeps the engine running while you listen, with a notification so you always know it is on'],
      ['Microphone', 'for the live meters only, when you turn them on. Nothing is recorded or stored'],
      ['Advertising ID', 'for the AdMob ads in the free version'],
    ],
    net: 'No. The sound processing runs on your phone. A connection is used only for the ads in the free version and the Pro purchase check.',
    netShort: 'No, sound is processed on the phone',
  },

  docsmining: {
    minAndroid: '7.0',
    who: 'anyone handling paper they would rather not hand to a cloud service: contracts, invoices, receipts, ID pages, letters and handwritten notes',
    subject: { short: 'your documents', long: 'the documents you scan' },
    groups: [
      ['From paper to page', 'Point the camera at a page and DocsMining finds the edges, straightens it and cleans it up, with colour, grayscale, black and white and ink filters. A scan takes up to 10 pages at a time, or 25 with Pro.'],
      ['Text you can use', 'Text recognition covers Latin, Chinese, Japanese, Korean and Devanagari scripts, so every word on the page can be searched and copied. Search is ranked, with the match highlighted, and the handwriting pad reads what you write with a finger or stylus.'],
      ['Translate without a connection', 'Pick a language and DocsMining lays the translation out on a clean page you can export. Each language model downloads once, then works with the radio off.'],
      ['Private, and ready to send', 'Pages moved to the vault are encrypted on the phone and kept out of search until you unlock them. Export as PDF, DOCX, Markdown or plain text in A4 or Letter, with your own watermark and logo. Annotate and sign with pen, highlighter and redaction. Receipts extract to CSV, business cards save to your contacts, and ID pages have their machine-readable zone read.'],
    ],
    free: 'Scanning with every filter, up to 10 pages at a time, folders and export to PDF, DOCX, Markdown and plain text, with ads.',
    pro: ['No ads', 'Text recognition, with copy, share and translate', 'Annotation and signing', 'The encrypted vault',
      'The handwriting pad', 'Receipt, business card and ID extraction', 'Your own watermark and logo on exports', 'Up to 25 pages per scan'],
    proNote: 'Watching an ad unlocks Pro for a short time, so you can try it first.',
    asks: [
      ['Camera', 'to scan pages'],
      ['Photos', 'to import a page you have already photographed'],
      ['Storage', 'to save your exports'],
      ['Biometrics', 'to lock the vault'],
      ['Contacts', 'only when you save a business card to your contacts'],
      ['Network', 'to download translation models, and for the ads and the Pro purchase check'],
      ['Advertising ID', 'for the AdMob ads in the free version'],
    ],
    net: 'Scanning, text recognition and translation run on your phone. A connection is used once per language to download its translation model, and for the ads in the free version and the Pro purchase check.',
    netShort: 'Offline, after a one-time language download',
  },

  convertmasterultra: {
    minAndroid: '7.0',
    who: 'creators, students, marketers and podcasters who want to convert media without sending it to someone else’s server',
    subject: { short: 'your media', long: 'the videos, audio and images you convert' },
    groups: [
      ['Fifty tools, one engine', 'Convert between video, audio, image and PDF formats. Trim, merge, compress, mute, reverse, boomerang and loop. Extract, boost, normalise and clean up audio with noise reduction and fades. Make GIFs, thumbnail sheets and vertical versions for Shorts, Reels and TikTok. Burn subtitles, add a watermark, create chapters or strip metadata, and turn audio plus a cover image into a podcast video.'],
      ['A queue you can walk away from', 'Stack conversions and let them run, with live progress, cancel and retry. Hardware encoders are used where your phone reports them, and Settings tells you plainly what your phone supports. One-tap presets cover Social, Instagram, YouTube and Discord.'],
      ['Everything in one library', 'Every output lands in the Library, where you can share, open, save or delete it.'],
    ],
    free: 'All fifty tools, one conversion at a time, with ads. Nothing you make is watermarked unless you add a watermark yourself.',
    pro: ['No ads', 'Three conversions running at once', 'H.265 and AV1 encoders', 'The YouTube 4K preset'],
    asks: [
      ['Photos, videos and audio', 'to read the files you convert'],
      ['Storage', 'to save results on older Android versions'],
      ['Network', 'for the ads and the Pro purchase check'],
      ['Advertising ID', 'for the AdMob ads in the free version'],
    ],
    net: 'Not for the conversions, which run on your phone. A connection is used for the ads in the free version and the Pro purchase check.',
    netShort: 'No, conversions run on the phone',
  },

  workxsuiteandroid: {
    minAndroid: '7.0',
    who: 'freelancers, students and journalists tired of paying a cloud subscription to open their own files',
    subject: { short: 'your documents', long: 'the documents and spreadsheets you open' },
    groups: [
      ['XPDF: read any PDF', 'Open a PDF at any zoom, search inside it, and share or print it. Scanned pages are read with text recognition on the phone, so searching, counting and translating work on paperwork with no selectable text.'],
      ['XDOC: write and save back cleanly', 'Edit .docx, .txt and .md with headings, bold, italic and underline, find and replace across the document, and export to PDF or print. Saving back to .docx leaves every other part of the file untouched.'],
      ['XMATH: spreadsheets with real formulas', 'SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, CONCAT and TEXTJOIN over cells and ranges. Sort, filter, format numbers, chart any two columns and group into a summary, with undo and redo across every edit. Numbers stay numbers and formulas stay formulas when you save back to .xlsx.'],
      ['A Copilot that stays on the phone', 'The Copilot works on whatever is open: it summarises a document from its own most representative sentences, lists what reads as a task, pulls out emails, links, dates and amounts, scores reading ease, and profiles a spreadsheet column by column. Whole documents translate on the phone in 59 languages once the language packs are downloaded.'],
    ],
    free: 'Every module, all three editors and the offline Copilot, with ads.',
    pro: ['No ads', 'Connect the Copilot to an AI account you already pay for'],
    proNote: 'Pro is not an AI subscription. You bring an account you already have, and the app never resells access.',
    asks: [
      ['Network', 'to download translation language packs, for the optional online AI providers with Pro, and for the ads and the Pro purchase check'],
      ['Advertising ID', 'for the AdMob ads in the free version'],
    ],
    net: 'The editors, text recognition, translation and the Copilot run on your phone. A connection is used once to download translation language packs, for the optional online AI providers with Pro, and for the ads and the Pro purchase check.',
    netShort: 'Offline, after a one-time language download',
  },
};
