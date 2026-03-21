# UI Structure Freeze

This is the explicit guardrail for the multi-brand skinning track.

## Current Decision

The current Emorya Gamify structure is frozen for the first theme-system pass.

That means the following are treated as stable:

- overall page structure
- route map and navigation model
- dashboard, profile, leaderboard, auth, admin, and achievements information architecture
- mission flows, CTA behavior, and user journey logic
- existing component responsibilities and data flow

## Allowed Changes

Theme work may change:

- color systems
- gradients and background treatments
- typography families, weights, and scale tokens
- spacing density through shared tokens
- border radius, shadows, and glow treatments
- brand assets like wordmarks and logos
- button, card, nav, and input visual styling
- hover, active, and disabled visual states

## Not Allowed In This Pass

Theme work must not:

- redesign layout structure
- change page composition
- alter user journeys
- move or rename core navigation items
- change component behavior to fit a brand skin
- introduce one-off brand overrides inside feature components

## Implementation Rule

All visual changes for this track should flow through:

- theme tokens
- theme metadata
- shared shell-level brand configuration

If a brand requirement cannot be expressed through the shared theme layer, treat it as a follow-up decision rather than forcing it into the current pass.
