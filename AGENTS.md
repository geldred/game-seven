<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Hosting security

- Production requires `GAME_PASSWORD`. The recap route verifies its own authenticated session and uses the local template by default
- Keep `ENABLE_PAID_RECAP` unset while the project is dormant. Only enable paid recaps after adding an external rate limit and provider spend cap
