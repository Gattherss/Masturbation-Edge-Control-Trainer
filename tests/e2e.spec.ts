// Basic skeleton, runnable after installing Playwright
import { test, expect } from '@playwright/test';

test('start -> switch -> finish -> save', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.getByRole('button', { name: '开始' }).click();
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: '结束并记录' }).click();
  await page.getByRole('button', { name: '提交并保存' }).click();
  await expect(page.getByText('已保存训练记录')).toBeVisible();
});
