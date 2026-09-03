/* ═══════════════════════════════════════════════════════════════════════
   HSX category taxonomy — the single source of truth shared by the app
   pages, the category hub pages and the catalogue.

   A hub exists so that a category query ("photo editor for Windows that
   works offline") has somewhere to land. Individual app pages answer
   brand queries; the catalogue answers "what does this studio make". The
   gap between the two is what these pages fill.

   Developer Tools has one unreleased title and therefore gets no hub: a
   near-empty landing page is worse than none at all. Add it here the day
   a second developer tool ships.
   ═══════════════════════════════════════════════════════════════════ */
module.exports.HUBS = [
  {
    key: 'ai',
    slug: 'local-ai-apps',
    nav: 'Local AI',
    h1: 'Local AI apps that run on your own GPU',
    title: 'Local AI apps for Windows, no subscription | HSX',
    desc: 'AI image, video and document tools that run on your own graphics card. No API key, no credits, no monthly bill, and nothing uploaded for processing.',
    lead: 'Every generative tool in this part of the catalogue does its work on the graphics card already in your machine. There is no API key to buy, no credit balance to top up and no queue to wait in, because there is no server involved at any point.',
    body: 'That changes the economics of using AI rather than just the privacy of it. Cloud tools charge per image or per month, which means the cost of experimenting never stops. These are bought once. Generate ten pictures or ten thousand; the price is the same, and the work you produce is yours without a licence term attached to it.',
    check: [
      ['Where the work actually happens', 'A tool that calls a remote service will stop working the moment that service changes its pricing or shuts down. Anything that runs on your own hardware keeps working.'],
      ['What it costs after the first month', 'Per-image credits and monthly plans make the real cost hard to see. A one-time purchase makes it obvious.'],
      ['What happens to what you make', 'Check whether your prompts and output are retained or reused. Nothing here leaves your machine, so the question does not arise.']
    ],
    faq: [
      ['Do these apps need an internet connection?', 'No. Once installed, the generative tools in this range run entirely on your own machine and keep working with the network switched off. A few titles fetch remote content by design and say so plainly on their own page.'],
      ['Do I need a powerful graphics card?', 'A dedicated GPU makes generation faster, and each application lists what it expects on its own page. The work is done locally either way, so speed is the variable, not capability.'],
      ['Is there a subscription?', 'No. Every application in the catalogue is a free trial followed by a single purchase. There is no recurring charge and no account to create.'],
      ['Can I use the output commercially?', 'What you generate on your own hardware is yours. The example images published in the HSX AI Studio gallery are a separate matter and are not licensed for reuse.']
    ]
  },
  {
    key: 'system',
    slug: 'pc-optimisation-apps',
    nav: 'PC & system',
    h1: 'PC optimisation and system tools for Windows',
    title: 'PC optimisation and system apps for Windows | HSX',
    desc: 'Cleanup, startup control, privacy settings, display comfort and desktop customisation for Windows 10 and 11. Local tools, no account, no telemetry.',
    lead: 'This is the largest part of the catalogue: tools that make a Windows machine behave the way you want it to. Cleanup and startup control, privacy switches gathered into one place, display comfort, docks and desktop shells.',
    body: 'System utilities are the category where trust matters most, because a cleanup tool by definition gets to see everything on the disk. That is the reason none of these applications create an account, phone home, or transmit a report of what they found. The tool runs, you see the result, and the result stays on your machine.',
    check: [
      ['What it sends back', 'Many free optimisers are funded by the data they collect. If a cleanup tool needs an account, ask what the account is for.'],
      ['Whether it explains what it is about to do', 'A tool that deletes on your behalf without showing you the list first is not saving you time, it is taking a risk with your files.'],
      ['Whether it is honest about results', 'Real gains from cleanup and startup control are modest and worth having. Anything promising to double your speed is selling something else.']
    ],
    faq: [
      ['Do these tools work on Windows 11?', 'Yes. Everything in this part of the catalogue targets Windows 10 and Windows 11, and each application states its requirements on its own page.'],
      ['Will they send a report of what is on my PC?', 'No. There is no telemetry in any application in the catalogue and no account to attach a report to. What the tool finds is shown to you and goes no further.'],
      ['Do I need to keep paying to keep using them?', 'No. Each application is a free trial followed by one purchase.'],
      ['Can I run several of them together?', 'Yes. They are separate applications with separate jobs and no shared background service running between them.']
    ]
  },
  {
    key: 'media',
    slug: 'audio-and-video-apps',
    nav: 'Audio & video',
    h1: 'Audio and video apps for Windows',
    title: 'Audio and video apps for Windows, offline | HSX',
    desc: 'Spatial audio, playback, screen recording, capture and editing for Windows. Processing runs on your own machine, so nothing is uploaded to be handled.',
    lead: 'Playback, spatial sound, capture, recording and editing. The common thread is that the processing happens on your own CPU or GPU rather than on a server you upload to and wait for.',
    body: 'For anyone working with footage or long recordings, that is a practical difference before it is a privacy one. Media files are large. Uploading an hour of video to be processed and downloading it again costs more time than the processing itself, and it puts an unreleased edit on someone else’s disk. Local processing removes both problems at once.',
    check: [
      ['Whether your files leave the machine', 'Any tool that processes in the cloud has a copy of your footage for as long as the job runs, and often longer.'],
      ['What formats it will still open in five years', 'Playback and conversion tools are worth keeping. A tool tied to a service is only as durable as the service.'],
      ['Whether there is a watermark or an export limit', 'A trial that watermarks output is fine. A purchase that still limits exports is not.']
    ],
    faq: [
      ['Are exported files watermarked?', 'No. Once an application is purchased, what it produces is a clean file with no watermark and no export limit.'],
      ['Do these apps upload my footage anywhere?', 'No. Conversion, capture and editing all run on your own hardware. There is no upload step, which is also why large files are not slow to work with.'],
      ['Is spatial audio supported on any headphones?', 'The spatial audio range works with ordinary stereo headphones and speakers. Each application explains what it supports on its own page.'],
      ['Can I use these commercially?', 'Yes. A purchased licence covers the work you produce with it.']
    ]
  },
  {
    key: 'creative',
    slug: 'document-and-design-apps',
    nav: 'Documents & design',
    h1: 'Document and design apps for Windows',
    title: 'Offline document and design apps for Windows | HSX',
    desc: 'PDF and document work, web and publishing tools, QR and packaging utilities for Windows. Files stay on your machine, with no account and no subscription.',
    lead: 'Documents, publishing, web design and the small production jobs that sit around them. The kind of work that used to need a suite of software and now usually needs a subscription instead.',
    body: 'Document tools are where the subscription model bites hardest, because the files are the ones you cannot afford to lose access to. A contract, an invoice archive or a client’s brand kit should not stop opening because a plan lapsed. Everything here is bought once and keeps working, and the documents never go anywhere to be processed.',
    check: [
      ['Whether your documents are uploaded to be converted', 'Most free online PDF tools work by receiving your file. For anything confidential that is the whole question.'],
      ['What happens when you stop paying', 'Subscription document software often locks the files, not just the features.'],
      ['Whether output is standard', 'A PDF or a document that only opens properly in the tool that made it is a trap worth avoiding.']
    ],
    faq: [
      ['Are my documents uploaded for conversion?', 'No. Conversion, translation and export all happen on your own machine. There is no upload and no server-side copy.'],
      ['Do the files stop opening if I stop paying?', 'No. Each application is a one-time purchase, and what it produces is a standard file that other software can open.'],
      ['Is there a file size limit?', 'No artificial one. What you can process is bounded by your own machine, not by a plan tier.'],
      ['Do I need an account?', 'No. No application in the catalogue asks you to create one.']
    ]
  },
  {
    key: 'files',
    slug: 'file-transfer-and-conversion-apps',
    nav: 'Files & transfer',
    h1: 'File transfer, conversion and archiving apps',
    title: 'Local file transfer and conversion apps | HSX',
    desc: 'Move files between your own devices over Wi-Fi, convert formats, archive and protect folders. No cloud account, no upload, no transfer size limit.',
    lead: 'Getting files from one device to another, changing what format they are in, and keeping them somewhere safe afterwards. Three jobs that the cloud made convenient and, in the process, made public.',
    body: 'Transferring a folder between two machines on the same network does not need a third party in the middle, and routing it through one adds an upload, a download and a copy on a server. The tools here move files directly between your own devices, convert formats on the machine holding the file, and archive without asking who you are.',
    check: [
      ['Whether there is a size or speed cap', 'Transfer services almost always have one, and it is usually the reason the free tier exists.'],
      ['Where the file rests in transit', 'A direct transfer between your devices has no resting place. A cloud relay always does.'],
      ['Whether archives use a standard format', 'An archive you can only open with the tool that made it is a liability, not a backup.']
    ],
    faq: [
      ['Is there a transfer size limit?', 'No. Transfers run directly between your own devices over your own network, so the limit is your hardware rather than a plan tier.'],
      ['Do the files pass through a server?', 'No. Nothing is relayed through a third party, which is also why transfers run at local network speed.'],
      ['Do both devices need the same app?', 'For direct transfers, yes. Each application explains what it pairs with on its own page.'],
      ['Are archives readable by other software?', 'Yes. Standard formats are used throughout, so an archive stays readable whatever you do next.']
    ]
  },
  {
    key: 'explore',
    slug: '3d-and-exploration-apps',
    nav: '3D & exploring',
    h1: '3D worlds, globes and exploration apps',
    title: '3D globe, space and exploration apps for PC | HSX',
    desc: 'Interactive 3D Earth globes, solar system explorers, survival worlds and game-making tools for Windows. Simulated on your own PC, bought once.',
    lead: 'Earth, space and generated worlds, simulated on your own machine. Globes you can orbit and descend into, a solar system to cross, worlds to survive in, and tools for building scenes of your own.',
    body: 'Simulation is the one place where running locally is not a compromise but the point. Terrain, orbits and generated worlds respond immediately because the calculation is happening on the machine in front of you, not being requested from somewhere else. Some titles in this group fetch map or imagery data as you explore, and each says so plainly on its own page.',
    check: [
      ['Whether it needs a constant connection', 'Simulation should not stall because the network did. Titles that stream imagery are marked as such here.'],
      ['Whether there are in-app purchases', 'There are none in this catalogue. The purchase is the whole application.'],
      ['What your machine needs to run it', 'Every title lists its requirements on its own page rather than after you have paid.']
    ],
    faq: [
      ['Are there in-app purchases or loot boxes?', 'No. Every title is a free trial followed by one purchase, with nothing to buy afterwards.'],
      ['Do these need to be online?', 'The simulation runs locally. A few titles fetch map or imagery data while you explore, and each one states that on its own page.'],
      ['Is there any advertising in them?', 'No. There is no advertising and no tracking inside any application in the catalogue.'],
      ['Do they collect play data?', 'No. There is no telemetry and no account, so there is nothing collecting a record of what you do.']
    ]
  },
  {
    key: 'photo',
    slug: 'photo-editing-apps',
    nav: 'Photo & imaging',
    h1: 'Photo editing and batch imaging apps for Windows',
    title: 'Offline photo editing apps for Windows | HSX',
    desc: 'Batch photo finishing, cutout, repair, duplicate cleanup and on-device AI retouching for Windows. Your pictures are never uploaded to a subscription service.',
    lead: 'Finishing a folder of pictures rather than perfecting a single one. Batch editing, background removal, repair, retouching and clearing out the duplicates that accumulate behind all of it.',
    body: 'Photo work is the clearest case for keeping processing local, because the folder in question is usually personal, commercially sensitive, or both. Product photography before a launch and family pictures are the same problem from opposite ends. Nothing here uploads a picture in order to work on it, and nothing retains one afterwards.',
    check: [
      ['Whether pictures are uploaded to be processed', 'Most one-click online editors work by receiving the image. For product shots or personal photos, that is the deciding question.'],
      ['Whether it handles a whole folder', 'Editing one picture at a time is a different job from finishing two hundred. Batch capability is what actually saves the day.'],
      ['Whether the original survives', 'Good tools write a new file. Anything editing in place without asking is a risk.']
    ],
    faq: [
      ['Are my photos uploaded anywhere?', 'No. Every editing and retouching step runs on your own machine, so nothing is transmitted and nothing is stored elsewhere.'],
      ['Can these process a whole folder at once?', 'Batch work is the point of this part of the catalogue. Each application states what it can process in bulk on its own page.'],
      ['Are the originals overwritten?', 'No. Output is written as new files unless you specifically ask otherwise.'],
      ['Is there a monthly fee?', 'No. Free trial, then a single purchase.']
    ]
  }
];

/* ═══════════════════════════════════════════════════════════════════════
   Minimum graphics requirement, in GB of dedicated VRAM.

   Only the applications that do real work on the GPU carry this — the AI
   generation range, the coding studio and the on-device assistants. It is a
   buyer's question ("will this run on my machine?"), not an internal detail,
   and every figure here is taken verbatim from the studio's own Microsoft
   Store listing. An app with no entry shows no badge: a guessed requirement
   is worse than none, because a refund is the cost of getting it wrong.

   To add one, quote the figure from that app's Store listing.
   ═══════════════════════════════════════════════════════════════════ */
module.exports.GPU_VRAM = {
  hsxstudioflow: 4,   // "dedicated GPU (NVIDIA, AMD, or Intel with 4 GB+ VRAM)"
  novadiffux:    4,   // "dedicated GPU (NVIDIA, AMD, or Intel with 4 GB+ VRAM)"
  quantumxai:    4,   // "Powered entirely by your local graphics hardware (4 GB+ VRAM)"
  infinitegenai: 4,   // "Runs locally on dedicated GPUs with 4 GB+ VRAM"
  nanocodify:    4,   // "Powered entirely by your local dedicated GPU ... 4 GB+ VRAM"
  dreammintai:   4,   // "Fully offline generation (dedicated 4 GB+ VRAM)" - hero tile
  fototensor:    6    // "Running directly on your dedicated GPU (6GB+ VRAM)"
};

/* ═══════════════════════════════════════════════════════════════════════
   Search-intent titles.

   An app page used to be titled the way the studio thinks of the product
   ("HSX StudioFlow - Local AI image studio"). Nobody searches that. They
   search for the job ("offline AI image generator windows"). The phrase
   below leads the title tag; the product name follows it, so the page can
   still be recognised once someone knows the brand.

   Each phrase is sized so that "<phrase> | <product name>" stays inside the
   ~60 characters Google renders before truncating. An app with no entry
   falls back to the tagline-derived title.
   ═══════════════════════════════════════════════════════════════════ */
module.exports.INTENT = {
  dreammintai:    'Offline AI Image and Video Generator',
  nostalgicel:    'Offline Retro Anime Image Generator',
  pixunica:       'Offline 4K AI Image Generator for Windows',
  writedesk:      'Offline AI Writing Assistant for Windows',
  /* system and performance */
  pctunex:                'Windows PC Cleaner and Startup Manager',
  pcturboxultra:          'Windows RAM and CPU Optimiser for Gaming',
  pcguardx:               'Windows Privacy Settings Dashboard, Offline',
  pcvisionbulwark:        'Blue Light and Eye Comfort App for PC',
  pcsensex:               'Offline Voice Control for Windows, On-Device',
  nimbusdock:             'Customisable Desktop Dock for Windows 11',
  xseasons:               'Live Seasonal Wallpaper App for Windows 11',
  horizonos:              'Private Desktop Shell and Launcher for Windows',
  nexusos:                'Synthwave Desktop Shell for Windows',
  quantumos:              'Desktop Command Console for Windows',
  focusroomultra:         'Offline Focus and Productivity Timer',
  automafy:               'Offline Task Automation Software for PC',
  autoclickx:             'Auto Clicker and Macro Recorder for PC',
  bootforge:              'Create Bootable USB Drives on Windows',
  earthos:                'Live World Map Desktop Wallpaper',
  browsex:                'Privacy Browser for Windows, No Tracking',
  aetheris:               'Unified Game Launcher for Windows',

  /* files and transfer */
  quantumdrop:            'Send Files Between Devices Over Wi-Fi',
  flipxstudio:            'Offline Media Converter for Windows',
  convertxpro:            'Offline File Converter for Windows',
  pcarchivepro:           'Zip, Extract and Encrypt Files on Windows',
  pcdownloadmanagerultra: 'Fast Resumable Download Manager',
  fileguardianultra:      'Offline File Backup and Version History',

  /* audio and video */
  spatiaxultra:           '3D Spatial Audio Software for Windows',
  hypersonusultra:        'Surround Sound Equaliser for Windows',
  vaudioelite:            'Media Player with Spatial Audio for Windows',
  medialucent:            'Streaming Hub and Media Player for PC',
  primecut:               'Offline Video Editor for Windows',
  beatxpro:               'Offline DJ Mixing Software for Windows',
  sensecapture:           'Sound-Triggered Camera and Voice Recorder',
  pcscreenrecorderpro:    'Screen Recorder with Step Guides',
  castvisuality:          'Screen Mirroring & Remote Control for PC',
  image3dx:               'Turn Photos into 3D Models, Offline',

  /* creative, documents and web */
  workxsuite:             'Offline PDF, Word and Spreadsheet Suite',
  webxstudio:             'Offline Drag-and-Drop Website Builder',
  creatorxstudio:         'Offline Creative Suite for Windows',
  docmento:               'Offline PDF Editor and Translator',
  spillframe:             'Drawing and Animation Studio for Windows',
  execrafter:             'Build Windows Apps Without Coding',
  qrcreatorstudio:        'Offline QR Code Generator for Windows',
  gamefabrix:             'Make 2D Games Without Coding, Offline',

  /* AI generation and assistants */
  hsxstudioflow:          'Offline AI Image Generator for Windows',
  novadiffux:             'Offline AI Image Generator, No Subscription',
  fototensor:             'Local AI Portrait Generator & Enhancer',
  artgenstudio:           'Offline AI Design and Poster Studio',
  quantumxai:             'Offline AI Image and Clip Maker',
  dreamgenaiultra:        'High-Res Offline AI Image Generator',
  infinitegenai:          'Unlimited Offline AI Image Maker',
  forgexpro:              'AI Prompt Builder for Windows, Offline',
  pocktium:               'Offline AI Assistant for Windows, No Account',
  docclarity:             'On-Device AI Document Analyser for PC',
  nanocodify:             'Private Offline Code Editor for Windows',

  /* photo and imaging */
  glowlab:                'Offline Photo Editor with AI Tools',
  photovidix:             'Local Photo and Video Organiser for PC',
  nanovisuality:          'AI Photo Enhancer and 4K Upscaler',
  pixumbrastudio:         'Batch Photo Editor with AI Cutout',
  mediatidyultra:         'Find Duplicate Photos and Free Disk Space',

  /* 3D and exploring */
  planetx:                '3D Space and Universe Explorer for Windows',
  planetxearthexplorer:   'Interactive 3D Earth Globe for PC',
  planetxinfinity:        'Offline Solar System Simulator for PC',
  terraorbitix:           '3D Globe and Earth Explorer for PC',

  /* Android */
  mobiletunex:            'Android Phone Cleaner and Storage Manager',
  spatiaxmobile:          '3D Spatial Audio App for Android',
  docsmining:             'Offline Document Scanner and OCR for Android',
  convertmasterultra:     'Offline Media Converter for Android',
  workxsuiteandroid:      'Offline PDF and Document Suite for Android'
};

/* ═══════════════════════════════════════════════════════════════════════
   Cross-cutting hubs.

   The seven hubs above follow the catalogue's own categories. These two do
   not: spatial audio sits inside Audio & Video, and privacy tools are spread
   across four categories. Both are real search demands in their own right,
   so they list apps explicitly by id. An app can appear in one of these as
   well as in its category hub - that is a second route in, not a duplicate,
   because the canonical description of every app still lives on its own page.
   ═══════════════════════════════════════════════════════════════════ */
module.exports.HUBS.push(
  {
    key: 'spatial', crossCut: true,
    ids: ['spatiaxultra', 'hypersonusultra', 'vaudioelite', 'medialucent', 'spatiaxmobile'],
    slug: 'spatial-audio-apps',
    nav: 'Spatial audio',
    h1: 'Spatial audio software for Windows and Android',
    title: '3D Spatial Audio Software for Windows | HSX',
    desc: 'Real-time 3D spatial audio, surround processing and equalisation for Windows and Android. Runs on your own device, with no account and no subscription.',
    lead: 'Sound that has a direction and a distance to it, produced on your own machine in real time rather than baked into a file somewhere else.',
    body: 'Spatial audio is one of the few things that genuinely has to happen locally. Processing has to keep up with playback, frame by frame, so a round trip to a server is not an option at any price. That makes this part of the catalogue the clearest example of why local processing is a capability rather than only a privacy position.',
    check: [
      ['Whether it works across every application', 'A spatial effect that only applies inside one media player is far less useful than one that sits under everything you play.'],
      ['Whether it needs particular headphones', 'Some systems only work with specific hardware. Anything here works with ordinary stereo headphones and speakers.'],
      ['What it does to latency', 'Real-time processing has to stay in step with the picture. Anything that adds noticeable delay is unusable for video and games.']
    ],
    faq: [
      ['Do I need special headphones for spatial audio?', 'No. Everything in this range works with ordinary stereo headphones and speakers, and each application states what it supports on its own page.'],
      ['Does it work with every app, or only a media player?', 'That varies by title and each one says so plainly. Some process everything the system plays; others work inside their own player.'],
      ['Is any of this processed in the cloud?', 'No. Real-time audio cannot survive a round trip to a server, so every part of the processing happens on your own device.'],
      ['Is there a subscription?', 'No. Free trial, then a single purchase.']
    ]
  },
  {
    key: 'privacy', crossCut: true,
    ids: ['pcguardx', 'browsex', 'fileguardianultra', 'xcipher', 'focusroomultra', 'horizonos'],
    slug: 'privacy-utilities',
    nav: 'Privacy tools',
    h1: 'Zero-telemetry privacy utilities for Windows',
    title: 'Zero Telemetry Privacy Tools for Windows | HSX',
    desc: 'Windows privacy controls, a tracking-free browser, encrypted file protection and a private desktop shell. No account, no telemetry, no data leaving your machine.',
    lead: 'Tools whose entire job is to reduce what leaves your machine — and which, reasonably enough, collect nothing themselves.',
    body: 'A privacy tool that phones home is not a privacy tool. Everything in this group is built so there is nothing to send and nowhere to send it: no account system, no analytics, no crash reporting, no licence server. What it finds and what it protects stays on the machine it runs on, and the per-application privacy policy says so in plain terms.',
    check: [
      ['What the tool itself collects', 'Ask this first. A great many free privacy utilities are funded by the data they gather about the people using them.'],
      ['Whether it needs an account', 'An account is a record of you held by someone else. None of these ask for one.'],
      ['Whether you can verify the claim', 'Every application here publishes its own privacy policy, and works with the network disconnected so you can check for yourself.']
    ],
    faq: [
      ['Do these tools collect any data about me?', 'No. There is no telemetry, no analytics and no crash reporting in any application in the catalogue, and no account to attach data to.'],
      ['Do I have to trust you on that?', 'Not entirely. Each application publishes its own privacy policy, and you can disconnect the network and confirm the tool still does its job.'],
      ['Is my encrypted data recoverable if I lose the key?', 'No. Keys never leave your device and are never held by the studio, which also means there is no recovery service. Keep a backup of your key.'],
      ['Do they work on Windows 11?', 'Yes. Each application states its requirements on its own page.']
    ]
  }
);
