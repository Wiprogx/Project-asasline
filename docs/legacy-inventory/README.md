---
title: "Legacy inventory"
description: "What the legacy app shows and decides, module by module, extracted so nothing is forgotten in the migration."
category: reference
status: generated
audience: ["developer", "agent"]
tags: ["tms", "legacy", "parity"]
---

# Legacy inventory

Everything the legacy app (`legacy/asasline-demo.html`, 16687 lines) shows or decides, extracted mechanically by `scripts/legacy-inventory.mjs` so nothing is forgotten in the migration. One file per module, split by the legacy file's own section banners; the demo-data section (L15420–L16369) is left out. Re-run the script after a change to the legacy reference; the parity review marks each row ported, adapted or dropped.

| Module                                                                                               | Lists | Tabs | Option sets | Screens | Fields | Shown | Selects | Tables | Actions | Checks | Confirms | Functions |
| ---------------------------------------------------------------------------------------------------- | ----- | ---- | ----------- | ------- | ------ | ----- | ------- | ------ | ------- | ------ | -------- | --------- |
| [Platform — data model, references, dates, people, navigation](platform.md)                          | 16    | 0    | 0           | 7       | 0      | 1     | 0       | 0      | 14      | 2      | 0        | 86        |
| [Catalogue, price lists and reference lists](catalogue.md)                                           | 14    | 0    | 0           | 1       | 3      | 0     | 1       | 0      | 1       | 0      | 0        | 51        |
| [Vessels, sailings and cut-offs](vessels.md)                                                         | 23    | 0    | 0           | 0       | 0      | 0     | 0       | 0      | 1       | 5      | 0        | 40        |
| [Home](home.md)                                                                                      | 5     | 0    | 0           | 2       | 0      | 0     | 0       | 0      | 7       | 0      | 1        | 30        |
| [Bookings — list, field registry, detail, copies, documents, files](bookings.md)                     | 14    | 1    | 2           | 14      | 97     | 72    | 18      | 10     | 71      | 11     | 12       | 223       |
| [Contacts](contacts.md)                                                                              | 10    | 1    | 0           | 15      | 81     | 16    | 18      | 5      | 47      | 31     | 5        | 142       |
| [Quotations — analytics, list, editor](quotations.md)                                                | 10    | 1    | 2           | 17      | 49     | 62    | 20      | 3      | 56      | 7      | 3        | 214       |
| [Activity — covers, document rules, automatic activities, calendar](activity.md)                     | 12    | 0    | 0           | 17      | 50     | 23    | 16      | 0      | 47      | 11     | 7        | 158       |
| [Discuss — routing, messages, templates, chat, calls, queue](discuss.md)                             | 15    | 1    | 0           | 12      | 28     | 9     | 9       | 0      | 32      | 13     | 1        | 121       |
| [Accounting](accounting.md)                                                                          | 20    | 2    | 2           | 37      | 90     | 67    | 20      | 13     | 86      | 121    | 7        | 331       |
| [Settings — rules editor, configuration tabs, people, links, demo, integrations, audit](settings.md) | 11    | 7    | 1           | 57      | 129    | 79    | 33      | 4      | 131     | 31     | 24       | 205       |
