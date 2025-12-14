# Screenshot Instructions

To update the screenshots in the README:

## Phase 1 Test Results Screenshot

1. Navigate to http://localhost:3000
2. Click "Phase 1: Z80 CPU" button
3. Wait for tests to complete
4. Scroll to show a good view of the test results (showing assembly mnemonics and opcodes)
5. Take screenshot and save as `docs/phase1-test-results.png`

## Phase 4 BASIC Modal Screenshot

1. Navigate to http://localhost:3000
2. Click "Phase 4: BASIC Programs" button
3. Wait for tests to start running
4. Find a test with "View BASIC Source & Results" link (e.g., "should handle simple PRINT program structure")
5. Click the "View BASIC Source & Results" link
6. The modal should open showing:
   - Test name as title
   - BASIC Source Code section with the program source
   - Program Output section with expected output
7. Take screenshot of the modal and save as `docs/phase4-basic-modal.png`

## Screenshot Tools

On macOS, you can use:

- `screencapture -l<window-id> docs/phase1-test-results.png` (capture specific window)
- Or use Chrome DevTools: F12 → More tools → Screenshot
- Or use Cmd+Shift+4 for area selection



