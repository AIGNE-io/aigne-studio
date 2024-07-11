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
