# Guide release schedule

Six guides are live. Fourteen are written and waiting in `scheduled/`,
set to go out one every two days.

## Releasing the next one

    node publish-guide.js            releases anything due today or earlier
    node publish-guide.js --next     releases the next one early
    node publish-guide.js --list     shows the queue

Then rebuild as usual:

    node gen-app-pages.js && node gen-category-pages.js && node build.js

The article moves up into `guides-src/`, gets stamped with the date it
actually went out, and appears on the site at the next build. Anything
still in `scheduled/` is not generated and not in the sitemap.

## Why they are staggered

Twenty articles appearing on one day, just before an AdSense review,
reads as a content dump. One every two days shows a site that publishes
regularly, which is what the review is looking for. The last one lands
on 3 October.

## Queue

| Release | Section | Title |
| --- | --- | --- |
| 2026-09-07 | Media | Why a video file will not play, and how to fix it |
| 2026-09-09 | Windows | Why your Windows PC feels slow, and what actually helps |
| 2026-09-11 | Photos and files | Sorting out a photo library that got away from you |
| 2026-09-13 | Local AI | What 7B, Q4 and the rest of a local AI model name mean |
| 2026-09-15 | Windows | Why your downloads are slow, and what to check first |
| 2026-09-17 | Audio | Spatial audio on Windows: what is real and what is marketing |
| 2026-09-19 | Documents | Why a PDF is 40 MB, and how to shrink it without wrecking it |
| 2026-09-21 | Security | QR codes: what they can do, and when not to scan one |
| 2026-09-23 | Files | ZIP, 7z and why some files refuse to compress |
| 2026-09-25 | Privacy | What Windows collects, and which settings are worth changing |
| 2026-09-27 | Media | Screen recording settings that actually matter |
| 2026-09-29 | Productivity | Automating the repetitive jobs on your PC |
| 2026-10-01 | Windows | Bootable USB drives, and making one before you need it |
| 2026-10-03 | Photos and files | Why your photo looks different on every screen |

Sections alternate deliberately, so consecutive releases do not look
like a run of the same subject.
