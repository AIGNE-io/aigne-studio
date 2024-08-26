## 0.4.37 (2024-8-26)

- feat: support editor emmet plugin & theme

## 0.4.36 (2024-8-26)

- fix: skip xss middleware for some internal api

## 0.4.35 (2024-8-22)

- chore: use @blocklet/uploader to uploader file

## 0.4.34 (2024-8-22)

- fix: skip non-string parameter rendering

## 0.4.33 (2024-8-21)

- fix: enable global shared vim settings

## 0.4.32 (2024-8-21)

- fix: xss attack
- fix: get userId from headers

## 0.4.31 (2024-8-21)

- fix: filter open embed agents

## 0.4.30 (2024-8-19)

- fix: switch the acquisition mode of multi-tenant mode

## 0.4.29 (2024-8-19)

- feat(open-embed): new agent-view and agent-call embed components

## 0.4.28 (2024-8-19)

- chore: support object type input parameter

## 0.4.27 (2024-8-16)

- feat: support resize and full screen the code editor

## 0.4.26 (2024-8-9)

- fix: number field cant input decimal

## 0.4.25 (2024-8-9)

- feat: check socket connect status

## 0.4.24 (2024-8-9)

- fix: ensure knowledge is copied when duplicating a project

## 0.4.23 (2024-8-9)

- chore: simplify render message logic
- fix: auto publish discuss error

## 0.4.22 (2024-8-6)

- fix: auto start cron jobs for all projects

## 0.4.21 (2024-8-6)

- chore: disable auto start cron jobs

## 0.4.20 (2024-8-6)

- chore: add cron job execution history support
- feat: support clear cache manual

## 0.4.19 (2024-8-5)

- fix: add hidden input parameter button

## 0.4.18 (2024-8-2)

- chore: remove unnecessary uploading dialog from project icon field

## 0.4.17 (2024-8-2)

- fix: In multi-tenant mode, copied projects on the projects page have the same name #1262
- fix: Appearance bug #1254
- fix: Unable to create a new folder when there is no agent #1251
- fix: Unable to sync YJS data when importing new data if there is a cache #1205

## 0.4.16 (2024-8-1)

- fix: copy project with all config files
- fix: config file maybe undefined

## 0.4.15 (2024-8-1)

- refactor: add ResourceManager to manage the resource blocklets
- feat: add cron jobs support

## 0.4.14 (2024-7-30)

- feat: support cache agent outputs
- feat: add streaming json template support

## 0.4.13 (2024-7-29)

- fix: editor color highlight issue with existing variables

## 0.4.12 (2024-7-28)

- chore: remove husky and use simple-git-hooks instead
- chore: optimize internal prompts for better response

## 0.4.11 (2024-7-27)

- chore: update deps

## 0.4.10 (2024-7-25)

- fix: ensure the name and description are synchronized with the store

## 0.4.9 (2024-7-24)

- fix: validate the partial outputs correctly

## 0.4.8 (2024-7-23)

- fix: skip assets patterns in the ssr route

## 0.4.7 (2024-7-23)

- fix(core): modal does not disappear when pressing esc

## 0.4.6 (2024-7-23)

- feat: respond partial ready outputs

## 0.4.5 (2024-7-23)

- chore: ignore text selection event for project list item
- chore: open document link in new tab

## 0.4.4 (2024-7-22)

- fix: compatible with old project settings file

## 0.4.3 (2024-7-21)

- fix: render input template for the nested agent inputs

## 0.4.2 (2024-7-20)

- chore: bump version

## 0.4.1 (2024-7-20)

- chore: bump version

## 0.4.0 (2024-7-19)

- chore: release v0.4.0

## 0.3.37 (2024-7-19)

- fix: import project from github error

## 0.3.36 (2024-7-19)

- fix: implement two-way binding between variable names in the prompt editor and in the inputs

## 0.3.35 (2024-7-19)

- chore: update ui text for share to community
- fix: use default model from project settings

## 0.3.34 (2024-7-19)

- chore: add gpt-4o-mini support

## 0.3.33 (2024-7-17)

- fix: restricted api error when copying a project contains assets

## 0.3.32 (2024-7-17)

- chore: set default values for agent profile
- chore: prioritize the logo in the agent profile
- chore: enable sqlite wal mode for better performance
- chore: save assets in git repository

## 0.3.31 (2024-7-13)

- fix: handle and retry when loading dynamic module error

## 0.3.30 (2024-7-11)

- feat: update call component to blocklet agent
- feat: migrate local OpenAPI interface to the server.

## 0.3.29 (2024-7-11)

- chore: using a language selector with improved interactivity

## 0.3.28 (2024-7-11)

- fix: the loading indicator is not reset after successful save

## 0.3.27 (2024-7-11)

- fix: multiple scrollbars of upload logo dialog

## 0.3.26 (2024-7-11)

- fix: github and did space sync

## 0.3.25 (2024-7-10)

- chore: improve development experience

## 0.3.24 (2024-7-9)

- fix: should respond json result if `responseType` is not stream

## 0.3.23 (2024-7-9)

- test: add e2e tests

## 0.3.22 (2024-7-9)

- chore: add server side aigne apis

## 0.3.21 (2024-7-6)

- chore: agent call other agent

## 0.3.20 (2024-7-5)

- chore: add `runAgent` api in aigne-sdk

## 0.3.19 (2024-7-5)

- feat: support sharing message to ArcBlock community

## 0.3.18 (2024-7-4)

- fix: failed to filter reference agent parameters in parameters

## 0.3.17 (2024-7-3)

- fix: correct parsing multiple function calling chunks

## 0.3.16 (2024-7-3)

- chore: export aigne components in aigne-sdk
- chore: add api to query all agents from aigne studio
- fix: menus do not appear when clicking the menu button on examples

## 0.3.15 (2024-7-2)

- chore: disable submit for the invalid inputs
- chore: support multiline text for question input
- fix: correct og meta for agent previewer

## 0.3.14 (2024-7-1)

- fix: only png files are allowed for the project icon
- fix: typing `{` evokes variables without requiring a space before `{`
- chore: display appearance component in the outputs table
- chore: show unauthorized permission error dialog

## 0.3.13 (2024-7-1)

- fix: knowledge not found when previewing other user's agents
- fix: error when search knowledge in the resource blocklet

## 0.3.12 (2024-6-29)

- fix: adapter settings not displaying

## 0.3.11 (2024-6-27)

- fix: export assets and use relative urls for assets
- fix: only allow publishing of owned knowledge

## 0.3.10 (2024-6-27)

- fix: chat history crashed

## 0.3.9 (2024-6-26)

- feat: new @blocklet/aigne-sdk package for aigne development

## 0.3.8 (2024-6-26)

- fix: strict match called agent in inputs
- chore: respond messageId in stream chunk

## 0.3.7 (2024-6-25)

- fix: enable save button in any historic commit #1166
- fix: fix: children agent tag name #1165
- feat: support hide a output

## 0.3.6 (2024-6-25)

- fix: set initial history state for prompt editor #1132
- fix: show variable options when typing `{{` #1130

## 0.3.5 (2024-6-25)

- chore: show memory count & default show non-empty variables scope

## 0.3.4 (2024-6-24)

- chore: add close icon on setting drawer

## 0.3.3 (2024-6-24)

- fix: copy example project configurations

## 0.3.2 (2024-6-24)

- chore: updated deps

## 0.3.1 (2024-6-22)

- fix: allow select components from pages-kit and resource blocklets

## 0.3.0 (2024-6-22)

- chore: update deps

## 0.2.66 (2024-6-21)

- fix: invalid knowledge resource blocklet metadata

## 0.2.65 (2024-6-21)

- fix: generated images not display in the debug view

## 0.2.64 (2024-6-21)

- chore: add screenshots for ai-runtime
- chore: hide navigation for aigne runtime and generated resource blocklets

## 0.2.63 (2024-6-21)

- fix: reset loading indicator after saving dialog is canceled
- chore: set agent detail link to the agent blocklet mount point
- chore: display agent logo and name in the preview header

## 0.2.62 (2024-6-21)

- chore: improve projects/knowledge page ux

## 0.2.61 (2024-6-21)

- chore: display icon before the custom input/output
- fix: the logo flashes when opening the agent view
- chore: add docLink and placeholder for secret inputs
- fix: run agent error if there is a input to retrieve chat history

## 0.2.60 (2024-6-20)

- feat: add home page to display agent list
- chore: update logo and readme

## 0.2.59 (2024-6-20)

- fix: publish resource blocklet error in strict mode

## 0.2.58 (2024-6-20)

- fix: display loading indicator for publish button
- fix: set first agent as entry
- chore: add blocklet isolation mode support

## 0.2.57 (2024-6-19)

- chore: update deps

## 0.2.56 (2024-6-19)

- fix: inherit identity from parent agent

## 0.2.55 (2024-6-19)

- fix: display knowledge idle status
- fix: throw error if the searched documents too large

## 0.2.54 (2024-6-19)

- feat: allow configuring the attachment of the URL and inputs in the shared content

## 0.2.53 (2024-6-19)

- fix: add more font options in appearance settings

## 0.2.52 (2024-6-18)

- feat: support publish knowledge resource blocklet

## 0.2.51 (2024-6-18)

- fix(runtime): switch ai-runtime group from engine to dapp

## 0.2.50 (2024-6-17)

- fix: move apis/components api to ai-runtime
- fix: dev crash if there is not dist

## 0.2.49 (2024-6-17)

- fix: migration from ai-studio may produce errors

## 0.2.48 (2024-6-16)

- fix: migrate knowledge from ai-studio

## 0.2.47 (2024-6-15)

- fix: prioritize query agent from resource blocklet

## 0.2.46 (2024-6-15)

- fix: include database migration scripts

## 0.2.45 (2024-6-15)

- chore: renew ai-runtime blocklet did

## 0.2.44 (2024-6-15)

- chore: update deps

## 0.2.43 (2024-6-15)

- chore: update github action tasks

## 0.2.42 (2024-6-15)

- feat: support run agent using the ai-runtime engine
