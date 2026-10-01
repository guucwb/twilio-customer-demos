# Read-only inspection — 2026-09-30

- Account: [account SID omitted] (active local profile GusFlex).
- Flex instance: GO94959f1133cb4269bff923c45627f268; status ok.
- Flex service: ISac62993efa3145cd7880ae1707f432f0.
- TaskRouter workspace: WSddbf4e9048a3f27ab2db79622303de37.
- Conversations service: ISfe2fdfd6ea2f4e90b79dcfade579f5ad.
- UI configuration: 2.n (not an exact resolved version). CLI scaffold selected 2.18.0.
- Email: email TaskRouter channel, Conversations email address with autocreation enabled and Studio flow configured; email attachment settings present. No email sent. Domain authentication/delivery not independently verified.
- Voice: three voice-capable numbers with routing configuration. End-to-end Flex delivery not tested.
- One worker, unavailable at inspection. Eight queues. Seven plugin records. Plugin service enabled. No legacy FlexFlows.
- CLI 6.2.0; plugin-flex 7.1.2; plugin-serverless 3.3.0; Node 20.19.5.
- Account-details GET returned 401/70004 with the API key; scoped service reads above succeeded. No credentials printed or copied.
- Only GET requests used; no Twilio resource mutation, deployment, or release.

## Brand inspection

Public https://www.betmgm.bet.br/entrar was attempted on 2026-09-30. Corporate Zscaler blocks the Gambling category. No bypass attempted. Use temporary BetMGM-inspired charcoal/ivory/warm gold, not a claim of verified exact brand values.

## Local development proof

Official command: `twilio flex:plugins:create plugin-betmgm --typescript --flexui2 --profile GusFlex`.
Generated under apps/betmgm, without deployment or release. Browser initially had no active Twilio login; user is signing in manually. Final validation results belong in validation.md.
