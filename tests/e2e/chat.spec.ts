import { test, expect } from '@playwright/test';

test('chat flow: Send-knap og besked vises', async ({ page }) => {
  // 1. Gå til chat-siden
  await page.goto('http://localhost:3000/chat');

  // 2. Check at Send-knappen starter som disabled
  const sendButton = page.getByRole('button', { name: 'Send' });
  await expect(sendButton).toBeDisabled();

  // 3. Udfyld input og send
  const input = page.getByRole('textbox');
  await input.fill('Hej');
  await expect(sendButton).toBeEnabled();
  await sendButton.click();

  // 4. Verificér at beskeden dukker op i chat-listen
  const message = page.getByText('Hej');
  await expect(message).toBeVisible();
}); 