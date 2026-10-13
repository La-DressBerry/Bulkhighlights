<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

Use asset pointers for uploaded video; the workspace player imports the current recording pointer so media stays outside source control.
Track accepted AI suggestion IDs separately from calibration decisions and batch snapshots; direct curation must add once and preserve human edits when Undo is unsafe.
Keep calibration suggestions temporary; only accepted corpus results create AI-assisted Highlights, while incomplete result reviews remain resumable in-session.
Use the shared BulkAiEntry page action for initial AI discovery on both dashboard pages; initialOnly limits Media list to the eligible first run without altering incremental Theme entries.
- Themes live in the store's workspace registry (addTheme/renameTheme, case-insensitive dedupe); every Theme picker and page reads workspaceThemes so modal-created or renamed Themes persist globally.
- AI review uses compact inline-editable cards and scoped tokens, with Theme management inside cards only; keep temporary calibration separate from workspace acceptance.
- Render the single active clip within its evidence item, side-by-side on desktop and adjacent below on narrow screens; this preserves source context without a detached preview.
- The deterministic AI review guardrail counts reliable human evidence per Theme (never AI evidence); tweak AI_REVIEW_RULE rather than adding mandatory review steps.
- AI calls go through src/lib/claude.server.ts (Anthropic SDK, ANTHROPIC_API_KEY from git-ignored .env.local); never commit keys.
